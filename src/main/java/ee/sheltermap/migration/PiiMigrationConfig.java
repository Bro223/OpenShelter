package ee.sheltermap.migration;

import ee.sheltermap.security.PiiCrypto;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Spring Boot discovers Flyway Java migrations provided as beans — this is
 * how {@link V13PiiEncryptionMigration} gets the env-keyed {@link PiiCrypto}
 * (a plain classpath scan cannot inject it).
 */
@Configuration
public class PiiMigrationConfig {

    @Bean
    public V13PiiEncryptionMigration v13PiiEncryptionMigration(PiiCrypto piiCrypto) {
        return new V13PiiEncryptionMigration(piiCrypto);
    }
}
