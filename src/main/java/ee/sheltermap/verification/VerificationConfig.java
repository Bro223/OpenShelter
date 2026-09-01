package ee.sheltermap.verification;

import ee.sheltermap.domain.VerificationLevel;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Wires {@link VerificationService} as a Spring bean.
 *
 * <p>The service stays a plain class (no Spring annotations); this config
 * collects the provider beans and builds the {@code level -> provider} map
 * the service constructor expects. Levels without a provider are simply
 * absent from the map and rejected by the service.
 */
@Configuration
public class VerificationConfig {

    @Bean
    public VerificationService verificationService(List<VerificationProvider> providers,
                                                   PendingVerificationRepository pendingRepository) {
        Map<VerificationLevel, VerificationProvider> byLevel = new EnumMap<>(VerificationLevel.class);
        for (VerificationProvider provider : providers) {
            byLevel.put(provider.level(), provider);
        }
        return new VerificationService(byLevel, pendingRepository);
    }
}
