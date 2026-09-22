package ee.sheltermap.ingestion;

import ee.sheltermap.app.DataImportLog;
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
 * <p>The {@link AtomicBoolean} overlap guard
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
    /** Audit sink for every run (data_imports) — null in plain unit tests. */
    private final DataImportLog importLog;
    private final AtomicBoolean running = new AtomicBoolean(false);

    /** Test constructor — no transaction manager (in-memory repos are not transactional). */
    public ShelterImportService(ShelterRegistryClient client, ShelterParser parser,
                                ShelterRepository shelters, Clock clock) {
        this(client, parser, shelters, clock, null, null);
    }

    /** Test constructor — transaction manager, no audit log. */
    public ShelterImportService(ShelterRegistryClient client, ShelterParser parser,
                                ShelterRepository shelters, Clock clock,
                                PlatformTransactionManager txManager) {
        this(client, parser, shelters, clock, txManager, null);
    }

    @Autowired
    public ShelterImportService(ShelterRegistryClient client, ShelterParser parser,
                                ShelterRepository shelters, Clock clock,
                                PlatformTransactionManager txManager,
                                DataImportLog importLog) {
        this.client = Objects.requireNonNull(client, "client");
        this.parser = Objects.requireNonNull(parser, "parser");
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.txTemplate = txManager == null ? null : new TransactionTemplate(txManager);
        this.importLog = importLog; // nullable — unit fakes may omit it
    }

    public ImportResult importFromRegistry() {
        if (!running.compareAndSet(false, true)) {
            log.warn("Registry import already running — skipping overlapping run");
            ImportResult result = ImportResult.skipped(clock.instant());
            recordAudit(result, "SKIPPED", null);
            return result;
        }
        try {
            Instant at = clock.instant();
            try {
                RegistryFetch fetched = client.fetch();
                if (fetched.notModified()) {
                    // 304: the local copy already is the latest — apply
                    // nothing (a delist over an empty set would wipe the
                    // source) and do not count it as a failure.
                    ImportResult result = new ImportResult(0, 0, 0, 0, 0, at, false,
                            fetched.dataVersion());
                    recordAudit(result, "NOT_MODIFIED", null);
                    log.info("Registry import: upstream unchanged ({}), nothing to apply",
                            fetched.dataVersion());
                    return result;
                }
                List<RegistryShelterDto> dtos = fetched.rows();
                // Per-row length pre-check BEFORE the single apply
                // transaction. An oversized value would abort the whole
                // single-transaction import at the DB; the documented
                // contract is "skipped and counted, never fatal".
                List<RegistryShelterDto> fitting = new ArrayList<>(dtos.size());
                int oversize = 0;
                for (RegistryShelterDto dto : dtos) {
                    if (fitsColumnLimits(dto)) {
                        fitting.add(dto);
                    } else {
                        oversize++;
                    }
                }
                if (oversize > 0) {
                    log.warn("Registry import dropped {} row(s) exceeding column limits "
                                    + "(name<=255, externalId<=128, address<=512, "
                                    + "county/municipality<=255, dataAsOf<=32, "
                                    + "sourceAttribution<=255) — counted as skipped",
                            oversize);
                }
                ImportResult result = applyImport(dtos, fitting, oversize, at,
                        fetched.rejectedExternalIds(), fetched.dataVersion());
                log.info("Registry import finished: created={} updated={} removed={} skipped={} failed={}",
                        result.created(), result.updated(), result.removed(), result.skipped(), result.failed());
                recordAudit(result, "OK", null);
                return result;
            } catch (RegistryUnavailableException e) {
                log.error("Registry import failed", e);
                ImportResult result = ImportResult.failure(at);
                recordAudit(result, "FAILED", e.getMessage());
                return result;
            }
        } finally {
            running.set(false);
        }
    }

    /** Transactional apply phase — fetch already happened outside the tx. */
    private ImportResult applyImport(List<RegistryShelterDto> fetched,
                                     List<RegistryShelterDto> fitting,
                                     int oversize, Instant at,
                                     List<String> rejected, String dataVersion) {
        if (txTemplate == null) {
            return doImport(fetched, fitting, oversize, at, rejected, dataVersion);
        }
        return txTemplate.execute(status -> doImport(fetched, fitting, oversize, at, rejected, dataVersion));
    }

    private ImportResult doImport(List<RegistryShelterDto> fetched,
                                  List<RegistryShelterDto> fitting,
                                  int oversize, Instant at,
                                  List<String> rejected, String dataVersion) {
        List<Shelter> parsed = parser.parse(fitting);
        int skipped = oversize + rejected.size() + (fitting.size() - parsed.size());
        if (!rejected.isEmpty()) {
            log.warn("Registry import: {} row(s) rejected by the client as unplaceable "
                    + "(already logged per row) — counted as skipped and retained "
                    + "(not delisted)", rejected.size());
        }

        // Keep-list for delisting = every id the registry currently serves —
        // including rows that failed the length pre-check or parsing, and rows
        // the client rejected as unplaceable (a live registry row must never
        // be deleted just because this run couldn't store or place it).
        List<String> fetchedIds = fetchedIds(fetched);
        fetchedIds.addAll(rejected);

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

        // Delist ONLY the source this run actually fetched. A source
        // without a fetcher (e.g. MUNICIPALITY today) keeps its rows — a
        // delist over an empty fetched set would wipe them. The fetched
        // source is declared by the client, so when a second registry
        // client arrives, its own run delists its own source.
        ShelterSource fetchedSource = client.source();
        int removed;
        if (fetchedIds.isEmpty()) {
            log.warn("Registry returned zero rows for source {} — delisting skipped, "
                    + "existing rows retained", fetchedSource);
            removed = 0;
        } else {
            removed = shelters.deleteBySourceAndExternalIdNotIn(fetchedSource, fetchedIds);
        }
        return new ImportResult(created, updated, removed, skipped, 0, at, false, dataVersion);
    }

    /**
     * Appends one data_imports audit row for the run. A failing audit
     * write must never break the import itself — the run's outcome is
     * already settled, the audit is best-effort observability.
     */
    private void recordAudit(ImportResult result, String status, String errorMessage) {
        if (importLog == null) {
            return;
        }
        try {
            importLog.record(new DataImportLog.Row(
                    client.source().name(), result.sourceVersion(), result.at(),
                    result.created(), result.updated(), result.removed(),
                    status, errorMessage));
        } catch (RuntimeException e) {
            log.error("Failed to record the data_imports audit row (status {})",
                    status, e);
        }
    }

    /**
     * Column-limit pre-check for one registry row (V1/V2/V3 sizes). The name
     * is checked AFTER the parser's normalisation, because that is what gets
     * stored. Oversized rows are skipped (counted), never fatal.
     */
    private static boolean fitsColumnLimits(RegistryShelterDto dto) {
        if (dto == null) {
            return false;
        }
        return fits(RegistryShelterParser.normalizeName(dto.name()), 255)   // shelters.name
                && fits(dto.externalId(), 128)                               // external_id
                && fits(dto.address(), 512)                                 // address
                && fits(dto.county(), 255)                                  // county
                && fits(dto.municipality(), 255)                            // municipality
                && fits(dto.dataAsOf(), 32)                                 // data_as_of
                && fits(dto.sourceAttribution(), 255);                      // source_attribution
    }

    private static boolean fits(String value, int maxLength) {
        return value == null || value.length() <= maxLength;
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
