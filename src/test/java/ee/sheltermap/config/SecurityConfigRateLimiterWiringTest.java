package ee.sheltermap.config;

import static org.assertj.core.api.Assertions.assertThat;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.auth.RateLimiter;
import ee.sheltermap.auth.TokenBucketRateLimiter;
import ee.sheltermap.verification.RollingContactOtpLimiter;
import java.lang.reflect.Field;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.context.properties.source.ConfigurationPropertySources;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.io.PathResource;

/**
 * The verified limits stay verified: every limiter bean SecurityConfig
 * declares must carry exactly what application.yml binds. This reads each
 * constructed bean back, field-level, against the yml values bound with
 * Spring's own {@link Binder} (the same relaxed binding the container
 * uses), so a row that wires the wrong property to a bucket — or a
 * construction that mangles a value — fails the build instead of silently
 * loosening or tightening a limit. The yml file is the "before" reference
 * for the limiter-bean refactor; it is untouched by it.
 *
 * <p>Plain JUnit, no Spring context — the same idiom as
 * {@link TestConfigOverlayTest} (the guard must not need the application
 * it guards).
 */
class SecurityConfigRateLimiterWiringTest {

    private static final Path MAIN_YML = Path.of("src/main/resources/application.yml");

    @Test
    void everyTokenBucketCarriesExactlyItsYmlCapacityAndRefill() {
        Binder binder = binderForMainYml();
        RateLimitProperties yml = binder.bind("app.ratelimit", RateLimitProperties.class).get();
        SecurityConfig config = new SecurityConfig();

        assertBucket("loginRateLimiter", config.loginRateLimiter(yml),
                yml.loginCapacity(), yml.loginRefillPerSecond());
        assertBucket("loginIpRateLimiter", config.loginIpRateLimiter(yml),
                yml.loginIpCapacity(), yml.loginIpRefillPerSecond());
        assertBucket("resetRateLimiter", config.resetRateLimiter(yml),
                yml.resetCapacity(), yml.resetRefillPerSecond());
        assertBucket("resetConfirmRateLimiter", config.resetConfirmRateLimiter(yml),
                yml.resetConfirmCapacity(), yml.resetConfirmRefillPerSecond());
        assertBucket("registerRateLimiter", config.registerRateLimiter(yml),
                yml.registerCapacity(), yml.registerRefillPerSecond());
        assertBucket("verifyRateLimiter", config.verifyRateLimiter(yml),
                yml.verifyCapacity(), yml.verifyRefillPerSecond());
        assertBucket("changeRequestRateLimiter", config.changeRequestRateLimiter(yml),
                yml.changeCapacity(), yml.changeRefillPerSecond());
        assertBucket("geoResolveRateLimiter", config.geoResolveRateLimiter(yml),
                yml.geoResolveCapacity(), yml.geoResolveRefillPerSecond());
        assertBucket("sessionRateLimiter", config.sessionRateLimiter(yml),
                yml.sessionCapacity(), yml.sessionRefillPerSecond());
    }

    @Test
    void theOtpCapAndTheAlertRingCarryTheirYmlLimits() {
        Binder binder = binderForMainYml();
        int otpMax = binder.bind("app.limits.otp-per-contact-max", Integer.class).get();
        int windowHours = binder.bind("app.limits.otp-per-contact-window-hours", Integer.class).get();
        int retained = binder.bind("app.limits.alerts-retained", Integer.class).get();
        SecurityConfig config = new SecurityConfig();

        RollingContactOtpLimiter otp = config.rollingContactOtpLimiter(otpMax, windowHours, Clock.systemUTC());
        assertThat(field(otp, "maxPerWindow")).as("otp max per window").isEqualTo(otpMax);
        assertThat(field(otp, "windowMillis")).as("otp rolling window")
                .isEqualTo(Duration.ofHours(windowHours).toMillis());

        ThrottleAlertRecorder recorder = config.throttleAlertRecorder(retained);
        assertThat(field(recorder, "retained")).as("alerts retained").isEqualTo(retained);
    }

    /** The bean is a token bucket, and its capacity + refill are the yml row. */
    private static void assertBucket(String bean, RateLimiter limiter, int capacity, double refillPerSecond) {
        assertThat(limiter).as(bean + " must be a token bucket").isInstanceOf(TokenBucketRateLimiter.class);
        assertThat(field(limiter, "capacity")).as(bean + " capacity").isEqualTo(capacity);
        assertThat(field(limiter, "refillPerSecond")).as(bean + " refill per second").isEqualTo(refillPerSecond);
    }

    private static Binder binderForMainYml() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new PathResource(MAIN_YML));
        Map<String, Object> flat = new HashMap<>();
        for (Map.Entry<Object, Object> e : yaml.getObject().entrySet()) {
            flat.put(String.valueOf(e.getKey()), e.getValue());
        }
        return new Binder(ConfigurationPropertySources.from(
                new MapPropertySource("main-yml", flat)));
    }

    private static Object field(Object target, String name) {
        try {
            Field field = target.getClass().getDeclaredField(name);
            field.setAccessible(true);
            return field.get(target);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError("cannot read back " + name + " from " + target.getClass(), e);
        }
    }
}
