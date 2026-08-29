package ee.sheltermap;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Shelter Map backend — application entry point.
 *
 * <p>Step 0: project skeleton only. No endpoints, no business logic yet;
 * the packages {@code domain}, {@code app}, {@code verification}, {@code auth},
 * {@code ingestion}, {@code api}, {@code persistence} are filled in later steps.</p>
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class ShelterMapApplication {

    public static void main(String[] args) {
        SpringApplication.run(ShelterMapApplication.class, args);
    }
}
