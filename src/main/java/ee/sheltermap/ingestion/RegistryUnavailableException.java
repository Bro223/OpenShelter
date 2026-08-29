package ee.sheltermap.ingestion;

/**
 * The explicit "registry is down" failure mode. Thrown by
 * {@link ShelterRegistryClient} implementations when the registry cannot be
 * reached after retries; caught by {@link ShelterImportService} so the app
 * never crashes because a public service is unavailable.
 */
public class RegistryUnavailableException extends RuntimeException {

    public RegistryUnavailableException(String message) {
        super(message);
    }

    public RegistryUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
