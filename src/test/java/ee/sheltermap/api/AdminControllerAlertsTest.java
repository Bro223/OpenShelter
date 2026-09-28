package ee.sheltermap.api;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.domain.AdminUser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The alert triage view's DEFAULT limit ({@code AdminController.ALERTS_DEFAULT_LIMIT}) —
 * the value was pinned nowhere: a near-neighbour swap (50 → 51) sailed
 * through AdminAlertsIT 11/11, because the IT never holds a fixture with
 * 51+ alerts, so the "1..200, default 50" the endpoint documents could
 * silently drift. Fifty-one alerts in the ring: the default response
 * must carry EXACTLY fifty, and an explicit limit must still reach the
 * fifty-first.
 */
class AdminControllerAlertsTest {

    private static final Instant NOW = Instant.parse("2026-09-11T12:00:00Z");

    private AdminController controller;

    @BeforeEach
    void setUp() {
        InMemoryUserRepository users = new InMemoryUserRepository();
        AdminUser admin = AdminUser.provisioned("Mod", "mod@sheltermap.ee", NOW);
        users.save(admin);

        ThrottleAlertRecorder alerts = new ThrottleAlertRecorder(128);
        for (int i = 1; i <= 51; i++) {
            alerts.submissionDailyCap(i, 60);
        }

        controller = new AdminController(null, new AdminAccess(users), alerts);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin.getId(), null, List.of()));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void theDefaultLimitServesExactlyFiftyOfFiftyOneAlerts() {
        assertThat(controller.listAlerts(null)).hasSize(50);
    }

    @Test
    void anExplicitLimitStillOverridesTheDefault() {
        assertThat(controller.listAlerts(51)).hasSize(51);
        assertThat(controller.listAlerts(200)).hasSize(51);
    }
}
