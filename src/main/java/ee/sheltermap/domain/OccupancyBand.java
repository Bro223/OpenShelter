package ee.sheltermap.domain;

/**
 * How full a shelter is, per the reporter (shelter-trust-and-reports D4).
 * Display-only — occupancy never affects visibility, status, markers or
 * filters; it degrades to silence once no report is fresh (≤ 2 h).
 */
public enum OccupancyBand {
    SPACE,
    GETTING_FULL,
    FULL
}
