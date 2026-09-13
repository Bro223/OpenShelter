package ee.sheltermap.app;

import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.GuestUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ShelterServiceTest {

    private static final GeoPoint POINT = new GeoPoint(59.438861, 24.754472);

    private InMemoryShelterRepository repo;
    private InMemoryUserRepository users;
    private ShelterService service;

    @BeforeEach
    void setUp() {
        repo = new InMemoryShelterRepository();
        users = new InMemoryUserRepository();
        service = new ShelterService(repo, users);
    }

    private static Shelter userPlace() {
        return userPlace("Kadriorg shelter");
    }

    private static Shelter userPlace(String name) {
        return new Shelter(name, POINT, ShelterStatus.ACTIVE, null, ShelterSource.USER);
    }

    private static RegisteredUser verifiedUser() {
        return verifiedUser(1L);
    }

    private static RegisteredUser verifiedUser(long id) {
        RegisteredUser user = new RegisteredUser(
                "Aleks", "aleks@example.com", "+37250000000");
        user.setId(id);
        user.addVerification(new VerificationClaim(
                VerificationLevel.PHONE, "twilio", "+37250000000", Instant.now()));
        return user;
    }

    @Test
    void guestCannotAddPlace() {
        assertThatThrownBy(() -> service.addPlace(new GuestUser(), userPlace()))
                .isInstanceOf(NotVerifiedException.class); // 403-mapped (B7c)

        assertThat(repo.findAll()).isEmpty();
    }

    @Test
    void unverifiedRegisteredUserCannotAddPlace() {
        RegisteredUser user = new RegisteredUser(
                "Aleks", "aleks@example.com", "+37250000000");
        user.setId(1L);

        assertThatThrownBy(() -> service.addPlace(user, userPlace()))
                .isInstanceOf(NotVerifiedException.class); // 403-mapped (B7c)

        assertThat(repo.findAll()).isEmpty();
    }

    @Test
    void verifiedUserCanAddPlaceSavedAsActiveUser() {
        Shelter place = userPlace();

        service.addPlace(verifiedUser(), place);

        assertThat(repo.findAll()).hasSize(1);
        Shelter saved = repo.findAll().get(0);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(saved.getSource()).isEqualTo(ShelterSource.USER);
        assertThat(saved.getExternalId()).isNull();
    }

    @Test
    void addPlaceRecordsTheAuthorLink() {
        Shelter place = userPlace();

        service.addPlace(verifiedUser(), place);

        Shelter saved = repo.findAll().get(0);
        assertThat(saved.getCreatedBy()).isEqualTo(1L);
        assertThat(repo.findByCreatedBy(1L)).containsExactly(saved);
    }

    @Test
    void findMineReturnsOnlyThatUsersShelters() {
        RegisteredUser other = verifiedUser(2L);

        service.addPlace(verifiedUser(), userPlace("Mine One"));
        service.addPlace(verifiedUser(), userPlace("Mine Two"));
        service.addPlace(other, userPlace("Not Mine"));

        assertThat(service.findMine(1L))
                .extracting(Shelter::getName)
                .containsExactly("Mine One", "Mine Two");
        assertThat(service.findMine(99L)).isEmpty();
    }

    @Test
    void updatePlaceReplacesEditableFieldsKeepingIdentityAuthorAndSource() {
        Shelter place = userPlace("Original");
        service.addPlace(verifiedUser(), place);
        Long id = place.getId();

        Shelter updated = new Shelter(
                "Renamed", new GeoPoint(58.95, 25.55), ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, "New description", 40);
        updated.setId(id);
        updated.setCreatedBy(place.getCreatedBy());
        service.updatePlace(updated);

        Shelter saved = repo.findById(id).orElseThrow();
        assertThat(saved.getName()).isEqualTo("Renamed");
        assertThat(saved.getLocation().lat()).isEqualTo(58.95);
        assertThat(saved.getLocation().lng()).isEqualTo(25.55);
        assertThat(saved.getDescription()).isEqualTo("New description");
        assertThat(saved.getCapacity()).isEqualTo(40);
        // identity + author link untouched
        assertThat(saved.getCreatedBy()).isEqualTo(1L);
        assertThat(saved.getSource()).isEqualTo(ShelterSource.USER);
        assertThat(saved.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
    }

    /**
     * In-memory repo that mimics {@code JpaShelterRepository}'s internal
     * guard: a save for a known id whose row is gone throws
     * {@code IllegalStateException} (the guard stays in the repository —
     * n12 only maps it at the service boundary).
     */
    private static final class GuardedShelterRepository extends InMemoryShelterRepository {
        @Override
        public void save(Shelter shelter) {
            if (shelter.getId() != null && findById(shelter.getId()).isEmpty()) {
                throw new IllegalStateException("cannot save shelter with unknown id " + shelter.getId());
            }
            super.save(shelter);
        }
    }

    @Test
    void updatePlaceOnAConcurrentlyDeletedShelterMapsToNotFound() {
        // n12 (2026-09-10 review): a concurrent DELETE commits between the
        // caller's read and the save — the repository's unknown-id guard must
        // surface as the same 404 as a plain not-found, never a 500.
        GuardedShelterRepository guardedRepo = new GuardedShelterRepository();
        ShelterService guarded = new ShelterService(guardedRepo, users);
        Shelter place = userPlace("Original");
        guarded.addPlace(verifiedUser(), place);
        Long id = place.getId();
        // the concurrent DELETE commits after the caller read the row
        guardedRepo.deleteById(id);

        Shelter stale = new Shelter(
                "Renamed", new GeoPoint(58.95, 25.55), ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, "New description", 40);
        stale.setId(id);

        assertThatThrownBy(() -> guarded.updatePlace(stale))
                .isInstanceOf(ShelterNotFoundException.class)
                .hasMessageContaining(String.valueOf(id));
        // nothing was written
        assertThat(guardedRepo.findById(id)).isEmpty();
    }

    @Test
    void updatePlaceRethrowsIllegalStateUnrelatedToAVanishedRow() {
        // the mapping is state-checked (row re-read), not message-parsed: an
        // IllegalStateException while the row still EXISTS propagates.
        InMemoryShelterRepository alwaysFailing = new InMemoryShelterRepository() {
            @Override
            public void save(Shelter shelter) {
                if (shelter.getId() != null) {
                    throw new IllegalStateException("boom (unrelated)");
                }
                super.save(shelter);
            }
        };
        ShelterService failing = new ShelterService(alwaysFailing, users);
        Shelter place = userPlace("Original");
        failing.addPlace(verifiedUser(), place);

        Shelter update = new Shelter(
                "Renamed", new GeoPoint(58.95, 25.55), ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, "New description", 40);
        update.setId(place.getId());

        assertThatThrownBy(() -> failing.updatePlace(update))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("boom");
    }

    @Test
    void deletePlaceRemovesTheRow() {
        Shelter place = userPlace();
        service.addPlace(verifiedUser(), place);

        service.deletePlace(place.getId());

        assertThat(repo.findById(place.getId())).isEmpty();
        assertThat(service.findMine(1L)).isEmpty();
    }

    @Test
    void rejectsPlaceThatIsNotActiveOrNotUserSource() {
        Shelter inactivePlace = new Shelter("P", POINT, ShelterStatus.INACTIVE, null, ShelterSource.USER);
        Shelter registryPlace = new Shelter("R", POINT, ShelterStatus.ACTIVE, "ext-1", ShelterSource.PAASETEAMET);

        assertThatThrownBy(() -> service.addPlace(verifiedUser(), inactivePlace))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.addPlace(verifiedUser(), registryPlace))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(repo.findAll()).isEmpty();
    }

    // ---------- per-user active-shelter cap (shelter-trust-and-reports D3) ----------

    @Test
    void eleventhActiveShelterIsRejected() {
        for (int i = 1; i <= 10; i++) {
            service.addPlace(verifiedUser(), userPlace("Varjend " + i));
        }

        assertThat(repo.countByCreatedByAndSourceAndStatus(1L, ShelterSource.USER, ShelterStatus.ACTIVE))
                .isEqualTo(10);
        assertThatThrownBy(() -> service.addPlace(verifiedUser(), userPlace("Üllejääja")))
                .isInstanceOf(ShelterLimitExceededException.class);
        assertThat(repo.findAll()).hasSize(10);
    }

    @Test
    void hiddenSheltersDoNotCountTowardsTheCap() {
        for (int i = 1; i <= 10; i++) {
            service.addPlace(verifiedUser(), userPlace("Varjend " + i));
        }
        // the admin (or a later change) deactivates one — it frees the cap
        repo.findAll().get(0).setStatus(ShelterStatus.INACTIVE);
        repo.save(repo.findAll().get(0));

        // the 11th ACTIVE submission is accepted now (10 rows, 9 active)
        service.addPlace(verifiedUser(), userPlace("Vaba"));
        assertThat(repo.findAll()).hasSize(11);
    }

    @Test
    void deletedSheltersFreeTheCap() {
        for (int i = 1; i <= 10; i++) {
            service.addPlace(verifiedUser(), userPlace("Varjend " + i));
        }
        service.deletePlace(repo.findAll().get(0).getId());

        service.addPlace(verifiedUser(), userPlace("Vaba"));
        assertThat(repo.findAll()).hasSize(10);
    }

    @Test
    void adminKindIsExemptFromTheCap() {
        InMemoryUserRepository adminUsers = new InMemoryUserRepository() {
            @Override
            public boolean isAdmin(long userId) {
                return true;
            }
        };
        ShelterService adminService = new ShelterService(repo, adminUsers);

        // 11 in a row — the admin is never capped
        for (int i = 1; i <= 11; i++) {
            adminService.addPlace(verifiedUser(), userPlace("Admin varjend " + i));
        }
        assertThat(repo.findAll()).hasSize(11);
    }
}
