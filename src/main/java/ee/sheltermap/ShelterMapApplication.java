package ee.sheltermap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * OpenShelter backend — application entry point.
 *
 * <p>The packages {@code domain}, {@code app}, {@code verification},
 * {@code auth}, {@code ingestion}, {@code api} and {@code persistence} hold
 * the application code; this class is the entry point only.</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class ShelterMapApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShelterMapApplication.class, args);
    }
}
