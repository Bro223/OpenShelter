package ee.sheltermap.ingestion;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Orchestrator: fetch → parse → dedupe → upsert → remove delisted (per
 * {@code 04-ingestion.puml}). Semantics:
 *
 * <ul>
 *   <li>existing {@code externalId} → <b>update</b>, new → <b>create</b>;</li>
 *   <li>registry rows missing from the latest fetch → <b>delete</b>
 *       ({@code source = REGISTRY} only — USER rows are sacred and never touched);</li>
 *   <li>malformed rows are skipped and counted ({@code skipped}), as are
 *       intra-fetch duplicate {@code externalId}s;</li>
 *   <li>registry down → {@code ImportResult} with {@code failed = 1}, no crash.</li>
 * </ul>
 *
 * <p>Hardening (code-review pass): the {@link AtomicBoolean} overlap guard
 * lives HERE — the scheduler and the startup runner share it, so a manual run
 * can never overlap a scheduled one. The network fetch happens OUTSIDE the
 * transaction (never hold a DB connection across HTTP calls); only the
 * apply/upsert/delist phase runs in one transaction, so a mid-batch failure
 * rolls back the whole import (no partial state).
 */
@Service
public class ShelterImportService {

    private static final Logger log = LoggerFactory.getLogger(ShelterImportService.class);

    private final ShelterRegistryClient client;
    private final ShelterParser parser;
    private final ShelterRepository shelters;
    private final Clock clock;
    private final TransactionTemplate txTemplate;
    private final AtomicBoolean running = new AtomicBoolean(false);

    /** Test constructor — no transaction manager (in-memory repos are not transactional). */
    public ShelterImportService(ShelterRegistryClient client, ShelterParser parser,
                                ShelterRepository shelters, Clock clock) {
        this(client, parser, shelters, clock, null);
    }

    @Autowired
    public ShelterImportService(ShelterRegistryClient client, ShelterParser parser,
                                ShelterRepository shelters, Clock clock,
                                PlatformTransactionManager txManager) {
        this.client = Objects.requireNonNull(client, "client");
        this.parser = Objects.requireNonNull(parser, "parser");
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.txTemplate = txManager == null ? null : new TransactionTemplate(txManager);
    }

    public ImportResult importFromRegistry() {
        if (!running.compareAndSet(false, true)) {
            log.warn("Registry import already running — skipping overlapping run");
            return ImportResult.skipped(clock.instant());
        }
        try {
            Instant at = clock.instant();
            try {
                List<RegistryShelterDto> dtos = client.fetchAll();
                ImportResult result = applyImport(dtos, at);
                log.info("Registry import finished: created={} updated={} removed={} skipped={} failed={}",
                        result.created(), result.updated(), result.removed(), result.skipped(), result.failed());
                return result;
            } catch (RegistryUnavailableException e) {
                log.error("Registry import failed: {}", e.getMessage());
                return ImportResult.failure(at);
            }
        } finally {
            running.set(false);
        }
    }

    /** Transactional apply phase — fetch already happened outside the tx. */
    private ImportResult applyImport(List<RegistryShelterDto> dtos, Instant at) {
        if (txTemplate == null) {
            return doImport(dtos, at);
        }
        return txTemplate.execute(status -> doImport(dtos, at));
    }

    private ImportResult doImport(List<RegistryShelterDto> dtos, Instant at) {
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
                skipped++; // duplicate row in one fetch — counted, first wins
                continue;
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
