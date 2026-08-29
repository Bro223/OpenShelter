package ee.sheltermap.ingestion;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Orchestrator: fetch → parse → dedupe → upsert → remove delisted (per
 * {@code 04-ingestion.puml}). Semantics:
 *
 * <ul>
 *   <li>existing {@code externalId} → <b>update</b>, new → <b>create</b>;</li>
 *   <li>registry rows missing from the latest fetch → <b>delete</b>
 *       ({@code source = REGISTRY} only — USER rows are sacred and never touched);</li>
 *   <li>malformed rows are skipped and counted ({@code skipped});</li>
 *   <li>registry down → {@code ImportResult} with {@code failed = 1}, no crash.</li>
 * </ul>
 */
@Service
public class ShelterImportService {

    private final ShelterRegistryClient client;
    private final ShelterParser parser;
    private final ShelterRepository shelters;
    private final Clock clock;

    public ShelterImportService(ShelterRegistryClient client, ShelterParser parser,
                                ShelterRepository shelters, Clock clock) {
        this.client = Objects.requireNonNull(client, "client");
        this.parser = Objects.requireNonNull(parser, "parser");
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    public ImportResult importFromRegistry() {
        Instant at = clock.instant();
        try {
            List<RegistryShelterDto> dtos = client.fetchAll();
            List<Shelter> parsed = parser.parse(dtos);
            int skipped = dtos.size() - parsed.size();

            // Keep-list for delisting = every id the registry currently serves,
            // including rows that failed parsing (a live registry row must never
            // be deleted just because this run couldn't parse it).
            List<String> fetchedIds = fetchedIds(dtos);

            int created = 0;
            int updated = 0;
            Set<String> seen = new HashSet<>();
            for (Shelter incoming : parsed) {
                if (!seen.add(incoming.getExternalId())) {
                    continue; // duplicate row in one fetch — first wins
                }
                Optional<Shelter> existing = shelters.findByExternalId(incoming.getExternalId());
                if (existing.isPresent()) {
                    shelters.save(merge(existing.get(), incoming));
                    updated++;
                } else {
                    shelters.save(incoming);
                    created++;
                }
            }

            int removed = shelters.deleteBySourceAndExternalIdNotIn(ShelterSource.PAASETEAMET, fetchedIds);
            return new ImportResult(created, updated, removed, skipped, 0, at);
        } catch (RegistryUnavailableException e) {
            return ImportResult.failure(at);
        }
    }

    /**
     * Fresh registry data wins, but the local row keeps its identity (id) so
     * persistence performs an UPDATE, not an INSERT. Status is refreshed to
     * ACTIVE — the registry published it, so it exists.
     */
    private static Shelter merge(Shelter existing, Shelter fresh) {
        Shelter merged = new Shelter(fresh.getName(), fresh.getLocation(),
                ShelterStatus.ACTIVE, fresh.getExternalId(), fresh.getSource(),
                fresh.getAddress(), fresh.getCounty(), fresh.getMunicipality(),
                fresh.getDataAsOf(), fresh.getSourceAttribution());
        merged.setId(existing.getId());
        return merged;
    }

    private static List<String> fetchedIds(List<RegistryShelterDto> dtos) {
        Set<String> ids = new LinkedHashSet<>();
        for (RegistryShelterDto dto : dtos) {
            if (dto != null && dto.externalId() != null && !dto.externalId().isBlank()) {
                ids.add(dto.externalId().trim());
            }
        }
        return new ArrayList<>(ids);
    }
}
