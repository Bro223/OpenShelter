package ee.sheltermap.app;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
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

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ShelterServiceTest {

    private static final GeoPoint POINT = new GeoPoint(59.438861, 24.754472);
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-09-13T08:00:00Z"), ZoneOffset.UTC);

    private InMemoryShelterRepository repo;
    private InMemoryUserRepository users;
    private InMemoryShelterHistoryLog history;
    private ShelterService service;
    /** The M3 slice-4 alert ring under test's services (the alerts
     *  themselves are unit-tested in ThrottleAlertRecorderTest). */
    private final ThrottleAlertRecorder alerts = new ThrottleAlertRecorder(128);

    @BeforeEach
    void setUp() {
        repo = new InMemoryShelterRepository();
        users = new InMemoryUserRepository();
        history = new InMemoryShelterHistoryLog(CLOCK);
        service = new ShelterService(repo, users, 1_000, 100.0, alerts, history);
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
        ShelterService guarded = new ShelterService(guardedRepo, users, 1_000, 100.0, alerts, history);
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
        ShelterService failing = new ShelterService(alwaysFailing, users, 1_000, 100.0, alerts, history);
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

        service.deletePlace(place.getId(), 1L);

        assertThat(repo.findById(place.getId())).isEmpty();
        assertThat(service.findMine(1L)).isEmpty();
    }

    // ---------- edit history (moderation-dashboard-completion M10 slice 2, D4) ----------

    @Test
    void addPlaceRecordsCreatedHistoryAttributedToTheSubmitter() {
        Shelter place = userPlace("Kadriorg kelder");

        service.addPlace(verifiedUser(), place);

        assertThat(history.rows()).hasSize(1);
        ShelterHistoryLog.Event created = history.rows().get(0);
        assertThat(created.shelterId()).isEqualTo(place.getId());
        assertThat(created.shelterName()).isEqualTo("Kadriorg kelder");
        assertThat(created.actorUserId()).isEqualTo(1L);
        assertThat(created.action()).isEqualTo(ShelterHistoryLog.Action.CREATED);
        assertThat(created.changes()).isNull();
        assertThat(history.findByShelterId(place.getId())).containsExactly(created);
    }

    @Test
    void ownerEditRecordsEditedHistoryWithExactlyTheMovedFields() {
        Shelter place = userPlace("Algus");
        service.addPlace(verifiedUser(), place);

        // only name + capacity move (description stays null, location and
        // locationKind untouched) — the diff must hold exactly those two
        Shelter updated = new Shelter(
                "Uus nimi", POINT, ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, 40);
        updated.setId(place.getId());
        service.updatePlace(updated);

        assertThat(history.rows()).hasSize(2);
        ShelterHistoryLog.Event edited = history.rows().get(1);
        assertThat(edited.action()).isEqualTo(ShelterHistoryLog.Action.EDITED);
        assertThat(edited.shelterName()).isEqualTo("Algus"); // snapshot at event time
        assertThat(edited.actorUserId()).isEqualTo(1L);
        assertThat(ShelterHistoryChanges.parse(edited.changes()))
                .containsExactly(
                        new ShelterHistoryLog.FieldChange("name", "Algus", "Uus nimi"),
                        new ShelterHistoryLog.FieldChange("capacity", null, "40"));
    }

    @Test
    void aNoOpPutRecordsNoHistoryRow() {
        Shelter place = userPlace("Samasamane");
        service.addPlace(verifiedUser(), place);

        Shelter same = new Shelter(
                "Samasamane", POINT, ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, null);
        same.setId(place.getId());
        service.updatePlace(same);

        assertThat(history.rows()).hasSize(1); // still only the CREATED row
        assertThat(history.rows().get(0).action()).isEqualTo(ShelterHistoryLog.Action.CREATED);
    }

    @Test
    void deletePlaceRecordsDeletedHistoryAttributedToTheActingAccount() {
        Shelter place = userPlace("Kõrvale");
        service.addPlace(verifiedUser(), place);

        service.deletePlace(place.getId(), 2L);

        assertThat(history.rows()).hasSize(2);
        ShelterHistoryLog.Event deleted = history.rows().get(1);
        assertThat(deleted.action()).isEqualTo(ShelterHistoryLog.Action.DELETED);
        assertThat(deleted.shelterId()).isEqualTo(place.getId()); // dangles after the delete
        assertThat(deleted.shelterName()).isEqualTo("Kõrvale");
        assertThat(deleted.actorUserId()).isEqualTo(2L);
        assertThat(deleted.changes()).isNull();
        // a deleted shelter's history stays findable by the (dangling) id
        assertThat(history.findByShelterId(place.getId())).hasSize(2);
    }

    @Test
    void updatePlaceOfAnAbsentShelterIsNotFoundBeforeAnyHistoryRow() {
        // D4: the old-row read precedes the diff — an absent row is a plain
        // 404 before any diff, not a save-time guard hit.
        Shelter stale = new Shelter(
                "Uus nimi", POINT, ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, null, 40);
        stale.setId(999L);

        assertThatThrownBy(() -> service.updatePlace(stale))
                .isInstanceOf(ShelterNotFoundException.class)
                .hasMessageContaining("999");
        assertThat(history.rows()).isEmpty();
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
        service.deletePlace(repo.findAll().get(0).getId(), 1L);

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
        ShelterService adminService = new ShelterService(repo, adminUsers, 1_000, 100.0, alerts, history);

        // 11 in a row — the admin is never capped
        for (int i = 1; i <= 11; i++) {
            adminService.addPlace(verifiedUser(), userPlace("Admin varjend " + i));
        }
        assertThat(repo.findAll()).hasSize(11);
    }

    // ---------- near-duplicate detection (abuse-limits M3 slice 3) ----------

    @Test
    void sameNameSamePointIsRejectedWithTheExistingRowId() {
        Shelter first = userPlace("Kadriorg shelter");
        service.addPlace(verifiedUser(), first);
        long firstId = first.getId();

        assertThatThrownBy(() -> service.addPlace(verifiedUser(), userPlace("Kadriorg shelter")))
                .isInstanceOf(ShelterDuplicateException.class)
                .hasMessageContaining("shelter #" + firstId);
        // the rejected row was NOT created
        assertThat(repo.findAll()).hasSize(1);
    }

    @Test
    void duplicateDetectionIsCrossUser() {
        service.addPlace(verifiedUser(), userPlace("Teise varjend"));

        // a throwaway account re-reporting the known place: same 409
        assertThatThrownBy(() -> service.addPlace(verifiedUser(2L), userPlace("Teise varjend")))
                .isInstanceOf(ShelterDuplicateException.class);
        assertThat(repo.findAll()).hasSize(1);
    }

    @Test
    void nameComparisonIgnoresCaseAndWhitespace() {
        service.addPlace(verifiedUser(), userPlace("  Kadriorg   Shelter "));

        assertThatThrownBy(() -> service.addPlace(verifiedUser(2L), userPlace("kadriorg shelter")))
                .isInstanceOf(ShelterDuplicateException.class);
        assertThat(repo.findAll()).hasSize(1);
    }

    @Test
    void differentNameAtTheSamePointIsAllowed() {
        service.addPlace(verifiedUser(), userPlace("A-bri"));
        service.addPlace(verifiedUser(2L), userPlace("B-bri"));

        assertThat(repo.findAll()).hasSize(2);
    }

    @Test
    void sameNameFarAwayIsAllowed() {
        service.addPlace(verifiedUser(), userPlace("Kaugel varjend"));
        // ~1 km north (0.009° lat) — outside the 100 m tolerance
        Shelter far = new Shelter("Kaugel varjend", new GeoPoint(POINT.lat() + 0.009, POINT.lng()),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);

        service.addPlace(verifiedUser(2L), far);
        assertThat(repo.findAll()).hasSize(2);
    }

    @Test
    void anInactiveRowIsNotADuplicate() {
        service.addPlace(verifiedUser(), userPlace("Peidetud varjend"));
        // the admin (or auto-hide) deactivates the row — re-adding is legal again
        Shelter row = repo.findAll().get(0);
        row.setStatus(ShelterStatus.INACTIVE);
        repo.save(row);

        service.addPlace(verifiedUser(2L), userPlace("Peidetud varjend"));
        assertThat(repo.findAll()).hasSize(2);
    }

    @Test
    void adminKindIsExemptFromDuplicateDetection() {
        InMemoryUserRepository adminUsers = new InMemoryUserRepository() {
            @Override
            public boolean isAdmin(long userId) {
                return true;
            }
        };
        ShelterService adminService = new ShelterService(repo, adminUsers, 1_000, 100.0, alerts, history);

        adminService.addPlace(verifiedUser(), userPlace("Admini kopeer"));
        adminService.addPlace(verifiedUser(2L), userPlace("Admini kopeer"));
        assertThat(repo.findAll()).hasSize(2);
    }

    @Test
    void theDailyCapPrecedesTheDuplicateCheck() {
        ShelterService capped = new ShelterService(repo, users, 1, 100.0, alerts, history);
        Shelter first = userPlace("Kapi varjend");
        capped.addPlace(verifiedUser(), first);
        // created_at is DB-owned (DEFAULT now()) — the in-memory fake does
        // not mimic that, so seed it for the window count
        first.setCreatedAt(Instant.now());

        // the 2nd submission is BOTH a duplicate of the user's own row and
        // past the (daily cap = 1) rate limit — the 429 cap is checked first
        assertThatThrownBy(() -> capped.addPlace(verifiedUser(), userPlace("Kapi varjend")))
                .isInstanceOf(ShelterSubmissionThrottledException.class);
        assertThat(repo.findAll()).hasSize(1);
    }

    @Test
    void nameNormalizationIsCaseAndWhitespaceInsensitive() {
        assertThat(ShelterService.normalizedNamesEqual("  Varjend  ja  abri ", "varjend ja abri")).isTrue();
        assertThat(ShelterService.normalizedNamesEqual("Varjend", "Varjend 2")).isFalse();
    }

    @Test
    void haversineMatchesKnownDistances() {
        assertThat(ShelterService.haversineMeters(POINT, POINT)).isZero();
        // ~0.001° latitude ≈ 111 m at any latitude (longitude spacing shrinks
        // with cos, latitude spacing does not)
        double oneMillidegreeLat =
                ShelterService.haversineMeters(POINT, new GeoPoint(POINT.lat() + 0.001, POINT.lng()));
        assertThat(oneMillidegreeLat).isBetween(110.0, 113.0);
    }
}
