package ee.sheltermap.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The extracted fail-closed template (W3-A) and the guards that now
 * route through it: the log/refusal pairing stays byte-identical to the
 * pre-extraction messages (the boot-failure output a deploy reads), and
 * the two-flag name composition is one implementation.
 */
class FailClosedGuardTest {

    private static Environment envWith(String... profiles) {
        StandardEnvironment env = new StandardEnvironment();
        env.setActiveProfiles(profiles);
        return env;
    }

    private static ListAppender<ILoggingEvent> captureLog(Class<?> guardClass) {
        Logger logger = (Logger) org.slf4j.LoggerFactory.getLogger(guardClass);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return appender;
    }

    private static void detach(ListAppender<ILoggingEvent> appender, Logger logger) {
        logger.detachAppender(appender);
    }

    // -------------------------------------------------- the template itself

    @Test
    void refuseToBootLogsTheFullLineThenThrowsTheRejection() {
        Logger logger = (Logger) org.slf4j.LoggerFactory.getLogger(FailClosedGuardTest.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            assertThatThrownBy(() -> FailClosedGuard.refuseToBoot(logger,
                    "REFUSING TO START — line.", "PRODUCTION REFUSED TO START: line."))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("PRODUCTION REFUSED TO START: line.");
            assertThat(appender.list).hasSize(1);
            assertThat(appender.list.get(0).getFormattedMessage())
                    .isEqualTo("REFUSING TO START — line.");
            assertThat(appender.list.get(0).getLevel()).isEqualTo(Level.ERROR);
        } finally {
            logger.detachAppender(appender);
        }
    }

    @Test
    void enabledFlagNamesComposesBothNeitherAndTheFirstWins() {
        assertThat(FailClosedGuard.enabledFlagNames(true, true, "a.enabled", "b.enabled"))
                .isEqualTo("a.enabled + b.enabled");
        assertThat(FailClosedGuard.enabledFlagNames(false, true, "a.enabled", "b.enabled"))
                .isEqualTo("b.enabled");
        assertThat(FailClosedGuard.enabledFlagNames(true, false, "a.enabled", "b.enabled"))
                .isEqualTo("a.enabled");
    }

    // ------------------------------------------------- the migrated guards

    @Test
    void apiDocsGuardKeepsItsExactLogAndRejectionWording() {
        ListAppender<ILoggingEvent> appender = captureLog(ApiDocsGuard.class);
        try {
            assertThatThrownBy(() -> new ApiDocsGuard(envWith("production"), true, false))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("PRODUCTION REFUSED TO START: OpenAPI documentation "
                            + "springdoc.api-docs.enabled "
                            + "enabled with active profiles=[production]. The API document and "
                            + "Swagger UI are dev-only — unset SPRINGDOC_ENABLED, or run with "
                            + "SPRING_PROFILES_ACTIVE=dev/test for local development.");
            assertThat(appender.list).hasSize(1);
            assertThat(appender.list.get(0).getFormattedMessage())
                    .isEqualTo("REFUSING TO START — OpenAPI documentation springdoc.api-docs.enabled "
                            + "enabled on a non-dev/test profile: active profiles=[production].");
        } finally {
            detach(appender, (Logger) org.slf4j.LoggerFactory.getLogger(ApiDocsGuard.class));
        }
    }

    @Test
    void devEndpointsGuardKeepsItsExactLogAndRejectionWording() {
        ListAppender<ILoggingEvent> appender = captureLog(DevEndpointsGuard.class);
        try {
            assertThatThrownBy(() -> new DevEndpointsGuard(envWith("production"), true, true))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("PRODUCTION REFUSED TO START: dev diagnostic endpoint(s) "
                            + "app.dev-email-test.enabled + app.dev-sms-test.enabled "
                            + "enabled with active profiles=[production]. The /dev/* test "
                            + "endpoints are dev-only — unset DEV_EMAIL_TEST_ENABLED / "
                            + "DEV_SMS_TEST_ENABLED, or run with SPRING_PROFILES_ACTIVE=dev/test for local "
                            + "development.");
            assertThat(appender.list.get(0).getFormattedMessage())
                    .isEqualTo("REFUSING TO START — dev diagnostic endpoint(s) "
                            + "app.dev-email-test.enabled + app.dev-sms-test.enabled "
                            + "enabled on a non-dev/test profile: active profiles=[production].");
        } finally {
            detach(appender, (Logger) org.slf4j.LoggerFactory.getLogger(DevEndpointsGuard.class));
        }
    }

    @Test
    void devSenderGuardKeepsItsExactLogAndRejectionWording() {
        ListAppender<ILoggingEvent> appender = captureLog(DevSenderGuard.class);
        try {
            assertThatThrownBy(() -> new DevSenderGuard(envWith("production"), "dev", "twilio"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("PRODUCTION REFUSED TO START: dev code sender(s) app.mail.provider "
                            + "active with profiles=[production]. The dev senders log every code "
                            + "in plaintext — set MAIL_PROVIDER=smtp-pulse / SMS_PROVIDER=twilio "
                            + "for real channels, or run with SPRING_PROFILES_ACTIVE=dev/test for local "
                            + "development.");
            assertThat(appender.list.get(0).getFormattedMessage())
                    .isEqualTo("REFUSING TO START — dev code sender(s) app.mail.provider "
                            + "active on a non-dev/test profile: active profiles=[production].");
        } finally {
            detach(appender, (Logger) org.slf4j.LoggerFactory.getLogger(DevSenderGuard.class));
        }
    }

    @Test
    void prodJwtGuardKeepsItsExactLogAndRejectionWording() {
        ListAppender<ILoggingEvent> appender = captureLog(ProdJwtGuard.class);
        try {
            assertThatThrownBy(() ->
                    new ProdJwtGuard(envWith("production"), ProdJwtGuard.DEV_DEFAULT_SECRET))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("PRODUCTION REFUSED TO START: app.jwt.secret is still the "
                            + "published dev-only default. Set JWT_SECRET to a strong random value "
                            + "(>= 32 bytes, not the published dev default), or run with "
                            + "SPRING_PROFILES_ACTIVE=dev/test for local development.");
            assertThat(appender.list.get(0).getFormattedMessage())
                    .isEqualTo("REFUSING TO START — app.jwt.secret is still the published dev-only "
                            + "default: active profiles=[production]. Set JWT_SECRET to a strong "
                            + "random value (>= 32 bytes, not the published dev default) or run "
                            + "with SPRING_PROFILES_ACTIVE=dev.");
        } finally {
            detach(appender, (Logger) org.slf4j.LoggerFactory.getLogger(ProdJwtGuard.class));
        }
    }

    @Test
    void theGuardsStillBootOnDevAndTestProfiles() {
        // the exemption rule is untouched by the extraction.
        new ApiDocsGuard(envWith("dev"), true, true);
        new ApiDocsGuard(envWith("test"), true, true);
        new DevEndpointsGuard(envWith("dev"), true, true);
        new DevSenderGuard(envWith("test"), "dev", "dev");
        new ProdJwtGuard(envWith("dev"), ProdJwtGuard.DEV_DEFAULT_SECRET);
    }

    @Test
    void aMixedProfileSetIsNotExempt() {
        // "production,dev" is not a dev deploy (the any-match trap).
        assertThatThrownBy(() -> new DevEndpointsGuard(envWith("production", "dev"), true, false))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageStartingWith("PRODUCTION REFUSED TO START:");
    }
}
