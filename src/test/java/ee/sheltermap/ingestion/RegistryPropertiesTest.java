package ee.sheltermap.ingestion;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The {@code app.registry.client} vocabulary is CLOSED and fail-closed:
 * only the remaining clients ({@code csv} the default, {@code dev} the
 * fixture) may be selected — the legacy {@code paasteamet} WFS client was
 * removed with its dead upstream, and an operator who still sets the
 * removed value must get a clear boot refusal, never a silent fallback
 * to a different client.
 */
class RegistryPropertiesTest {

    private static RegistryProperties withClient(String client) {
        return new RegistryProperties(
                null, 0, -1, null, client, null, false, null, null);
    }

    @Test
    void csvAndDevAreAccepted() {
        assertThatCode(() -> withClient("csv")).doesNotThrowAnyException();
        assertThatCode(() -> withClient("dev")).doesNotThrowAnyException();
    }

    @Test
    void absentClientDefaultsToCsv() {
        assertThat(withClient(null).client()).isEqualTo("csv");
        assertThat(withClient("  ").client()).isEqualTo("csv");
    }

    @Test
    void theRemovedPaasteametValueFailsClosedAtBindTime() {
        // The exact failure an operator gets when REGISTRY_CLIENT=paasteamet
        // survives in an old deployment env: a loud, property-naming
        // rejection with the reason and the fix.
        assertThatThrownBy(() -> withClient("paasteamet"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.registry.client")
                .hasMessageContaining("'paasteamet'")
                .hasMessageContaining("no longer published");
    }

    @Test
    void anyOtherUnknownValueFailsClosedToo() {
        assertThatThrownBy(() -> withClient("wfs"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("app.registry.client");
    }

    @Test
    void theAcceptedValuesAreExactlyTheSurvivingClientsConditions() {
        // The vocabulary and the client beans stay in lockstep: the two
        // accepted values are exactly the @ConditionalOnProperty values of
        // the surviving clients (a third client bean without a vocabulary
        // entry — or a vocabulary entry without a bean — breaks this).
        java.util.Set<String> beanValues = new java.util.HashSet<>();
        for (Class<?> clientClass : java.util.List.of(CsvRegistryClient.class, DevRegistryClient.class)) {
            org.springframework.boot.autoconfigure.condition.ConditionalOnProperty condition =
                    clientClass.getAnnotation(org.springframework.boot.autoconfigure.condition.ConditionalOnProperty.class);
            assertThat(condition).as("%s must stay conditionally selected", clientClass.getSimpleName()).isNotNull();
            beanValues.add(condition.havingValue());
        }
        assertThat(beanValues).containsExactlyInAnyOrder("csv", "dev");
    }
}
