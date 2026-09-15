package ee.sheltermap.verification;

import ee.sheltermap.alerts.ThrottleAlertRecorder;
import ee.sheltermap.domain.VerificationLevel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;
import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Wires {@link VerificationService} as a Spring bean.
 *
 * <p>The service stays a plain class (no Spring annotations); this config
 * collects the provider beans, builds the {@code level -> provider} map the
 * service constructor expects, and provides the durable
 * {@link VerificationSendLog} (file-backed — survives restarts, product
 * decision for the anti-spam daily cap).
 */
@Configuration
public class VerificationConfig {

    @Bean
    public VerificationSendLog verificationSendLog(VerificationProperties properties, Clock clock) {
        return new FileVerificationSendLog(Path.of(properties.sendLogPath()), clock);
    }

    @Bean
    public VerificationService verificationService(List<VerificationProvider> providers,
                                                   PendingVerificationRepository pendingRepository,
                                                   VerificationSendLog sendLog,
                                                   RollingContactOtpLimiter contactLimiter,
                                                   VerificationProperties properties,
                                                   Clock clock,
                                                   ThrottleAlertRecorder alerts) {
        Map<VerificationLevel, VerificationProvider> byLevel = new EnumMap<>(VerificationLevel.class);
        for (VerificationProvider provider : providers) {
            byLevel.put(provider.level(), provider);
        }
        return new VerificationService(byLevel, pendingRepository, sendLog, contactLimiter, properties, clock, alerts);
    }
}
