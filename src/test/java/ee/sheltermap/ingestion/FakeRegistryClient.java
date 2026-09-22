package ee.sheltermap.ingestion;

import ee.sheltermap.domain.ShelterSource;

import java.util.List;

/** Configurable {@link ShelterRegistryClient} for import-service tests. */
class FakeRegistryClient implements ShelterRegistryClient {

    private final List<RegistryShelterDto> result;
    private final boolean fail;
    /** Non-null: serve this fixed fetch (version stamp, rejected rows). */
    private final RegistryFetch fixedFetch;

    private FakeRegistryClient(List<RegistryShelterDto> result, boolean fail) {
        this(result, fail, null);
    }

    private FakeRegistryClient(List<RegistryShelterDto> result, boolean fail, RegistryFetch fixedFetch) {
        this.result = result;
        this.fail = fail;
        this.fixedFetch = fixedFetch;
    }

    static FakeRegistryClient returning(RegistryShelterDto... dtos) {
        return new FakeRegistryClient(List.of(dtos), false);
    }

    static FakeRegistryClient returning(List<RegistryShelterDto> dtos) {
        return new FakeRegistryClient(dtos, false);
    }

    /** A client that serves a fixed {@link RegistryFetch} (e.g. with rejected rows). */
    static FakeRegistryClient fetch(RegistryFetch fetch) {
        return new FakeRegistryClient(List.of(), false, fetch);
    }

    /** A client whose registry is unreachable. */
    static FakeRegistryClient down() {
        return new FakeRegistryClient(List.of(), true);
    }

    @Override
    public ShelterSource source() {
        return ShelterSource.PAASETEAMET;
    }

    @Override
    public List<RegistryShelterDto> fetchAll() {
        if (fail) {
            throw new RegistryUnavailableException("registry is down (test)");
        }
        return result;
    }

    @Override
    public RegistryFetch fetch() {
        if (fixedFetch != null) {
            return fixedFetch;
        }
        return RegistryFetch.of(fetchAll());
    }
}
