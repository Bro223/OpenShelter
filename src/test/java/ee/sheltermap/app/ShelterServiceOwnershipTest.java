package ee.sheltermap.app;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The ownership enforcement moved to the service boundary (W3-A):
 * {@link ShelterService#requireOwnedBy} (404/403, the rule the controller
 * used to inline), {@link ShelterService#updateOwned} (the guard on the
 * owner's update) and {@link ShelterService#deletePlaceByAdmin} (404/409
 * import-owned, the admin hard-delete boundary). The status vocabulary
 * and messages are byte-identical to the pre-extraction controller rule.
 */
class ShelterServiceOwnershipTest {

    private static final GeoPoint POINT = new GeoPoint(59.438861, 24.754472);
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-09-13T08:00:00Z"), ZoneOffset.UTC);

    private InMemoryShelterRepository repo;
    private InMemoryShelterHistoryLog history;
    private ShelterService service;

    @BeforeEach
    void setUp() {
        repo = new InMemoryShelterRepository();
        history = new InMemoryShelterHistoryLog(CLOCK);
        service = new ShelterService(repo, new InMemoryUserRepository(), 1_000, 100.0,
                new ThrottleAlertRecorder(128), history, CLOCK);
    }

    private static Shelter place(String name, ShelterSource source) {
        return new Shelter(name, POINT, ShelterStatus.ACTIVE,
                source == ShelterSource.USER ? null : "registry-id", source);
    }

    private Shelter saveUserPlace(long authorId) {
        Shelter place = place("Kadriorg shelter", ShelterSource.USER);
        place.setCreatedBy(authorId);
        repo.save(place); // the fake assigns the id on the object
        return place;
    }

    // --------------------------------------------------------- requireOwnedBy

    @Test
    void anUnknownShelterIsA404() {
        assertThatThrownBy(() -> service.requireOwnedBy(999L, 1L))
                .isInstanceOf(ShelterNotFoundException.class);
    }

    @Test
    void theAuthorPassesAndGetsTheRow() {
        Shelter place = saveUserPlace(1L);
        assertThat(service.requireOwnedBy(place.getId(), 1L)).isSameAs(place);
    }

    @Test
    void anotherUsersRowIsA403() {
        Shelter place = saveUserPlace(1L);
        assertThatThrownBy(() -> service.requireOwnedBy(place.getId(), 2L))
                .isInstanceOf(NotAuthorException.class)
                .hasMessage(ShelterService.NOT_AUTHOR_MESSAGE)
                .hasMessage("Only the author may modify this shelter");
    }

    @Test
    void aRegistryRowIsUnmanageableByAnyone() {
        Shelter place = place("Town hall", ShelterSource.PAASETEAMET);
        repo.save(place);
        assertThatThrownBy(() -> service.requireOwnedBy(place.getId(), 1L))
                .isInstanceOf(NotAuthorException.class)
                .hasMessage(ShelterService.NOT_AUTHOR_MESSAGE);
    }

    @Test
    void aLegacyRowWithoutAnAuthorIsUnmanageable() {
        // A USER-source row with no created_by (pre-V7 legacy data):
        // unmanageable — nobody can prove authorship.
        Shelter place = place("Legacy shelter", ShelterSource.USER);
        repo.save(place);
        assertThat(place.getCreatedBy()).isNull();
        assertThatThrownBy(() -> service.requireOwnedBy(place.getId(), 1L))
                .isInstanceOf(NotAuthorException.class)
                .hasMessage(ShelterService.NOT_AUTHOR_MESSAGE);
    }

    // ------------------------------------------------------------ updateOwned

    @Test
    void theAuthorCanUpdateThroughTheBoundary() {
        Shelter place = saveUserPlace(1L);
        Shelter next = place("Renamed shelter", ShelterSource.USER);
        next.setId(place.getId());
        next.setCreatedAt(place.getCreatedAt());
        next.setCreatedBy(place.getCreatedBy());

        service.updateOwned(1L, next);

        Shelter stored = repo.findById(place.getId()).orElseThrow();
        assertThat(stored.getName()).isEqualTo("Renamed shelter");
    }

    @Test
    void aNonAuthorUpdateIsA403ThatChangesNothing() {
        Shelter place = saveUserPlace(1L);
        Shelter next = place("Sneaky rename", ShelterSource.USER);
        next.setId(place.getId());

        assertThatThrownBy(() -> service.updateOwned(2L, next))
                .isInstanceOf(NotAuthorException.class)
                .hasMessage("Only the author may modify this shelter");
        assertThat(repo.findById(place.getId()).orElseThrow().getName())
                .isEqualTo("Kadriorg shelter");
    }

    // ------------------------------------------------------ deletePlaceByAdmin

    @Test
    void anUnknownShelterIsA404OnTheAdminDelete() {
        assertThatThrownBy(() -> service.deletePlaceByAdmin(7L, 999L))
                .isInstanceOf(ShelterNotFoundException.class);
    }

    @Test
    void aRegistryRowIsA409ImportOwnedOnTheAdminDelete() {
        Shelter place = place("Town hall", ShelterSource.PAASETEAMET);
        repo.save(place);
        assertThatThrownBy(() -> service.deletePlaceByAdmin(7L, place.getId()))
                .isInstanceOf(ImportOwnedShelterException.class)
                .hasMessage(ShelterService.IMPORT_OWNED_MESSAGE)
                .hasMessage("Registry shelters are import-owned and cannot be moderated here");
        // and the row is still there.
        assertThat(repo.findById(place.getId())).isPresent();
    }

    @Test
    void aUserRowIsDeletedOnTheAdminDelete() {
        Shelter place = saveUserPlace(1L);
        service.deletePlaceByAdmin(7L, place.getId());
        assertThat(repo.findById(place.getId())).isEmpty();
    }

    // ------------------------------------- shared guards (W4-A: one guard per rule)

    @Test
    void requireShelterAnswers404ForAnUnknownIdAndTheRowOtherwise() {
        assertThatThrownBy(() -> service.requireShelter(999L))
                .isInstanceOf(ShelterNotFoundException.class);
        Shelter place = saveUserPlace(1L);
        assertThat(service.requireShelter(place.getId())).isSameAs(repo.findById(place.getId()).orElseThrow());
    }

    @Test
    void requireUserOwnedPassesAUserRowAndRefusesARegistryRow() {
        // The single D4 guard every admin write on a shelter row goes
        // through (the admin service's private copy is gone): USER rows
        // pass, registry rows are import-owned (409), fail-first.
        Shelter userPlace = saveUserPlace(1L);
        service.requireUserOwned(userPlace);
        Shelter registry = place("Town hall", ShelterSource.PAASETEAMET);
        assertThatThrownBy(() -> service.requireUserOwned(registry))
                .isInstanceOf(ImportOwnedShelterException.class)
                .hasMessage(ShelterService.IMPORT_OWNED_MESSAGE);
    }
}
