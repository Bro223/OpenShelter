package ee.sheltermap.ingestion;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * Reads a local JSON fixture (classpath {@code registry/dev-shelters.json}) —
 * dev/CI runs with no network. Swap this impl for the real one via the
 * {@code app.registry.client} property (see {@code application.yml}).
 */
@Service
@ConditionalOnProperty(name = "app.registry.client", havingValue = "dev")
public class DevRegistryClient implements ShelterRegistryClient {

    private static final String FIXTURE = "registry/dev-shelters.json";

    private final ObjectMapper mapper;

    public DevRegistryClient(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public List<RegistryShelterDto> fetchAll() {
        try (InputStream in = new ClassPathResource(FIXTURE).getInputStream()) {
            return List.copyOf(mapper.readValue(
                    in, mapper.getTypeFactory().constructCollectionType(List.class, RegistryShelterDto.class)));
        } catch (IOException e) {
            throw new RegistryUnavailableException("Failed to read dev fixture " + FIXTURE, e);
        }
    }
}
