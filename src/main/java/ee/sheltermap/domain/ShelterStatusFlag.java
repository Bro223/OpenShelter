package ee.sheltermap.domain;

/**
 * The display flag CLOSED vs OPEN_CONFIRMED reports net out to
 * (shelter-trust-and-reports D1) — computed at read time, never stored:
 * more closed than confirmed → {@link #REPORTED_CLOSED} (the confirmed
 * side may be 0 — "2 users reported closed, nobody confirmed it open" is
 * exactly the case the flag exists for); confirmed ≥ closed with BOTH
 * sides ≥ 1 → {@link #CONFIRMED_OPEN} (a tie is a confirmed open);
 * otherwise the DTO field is null (no closed reports at all, or
 * confirmations with nobody claiming closed).
 */
public enum ShelterStatusFlag {
    REPORTED_CLOSED,
    CONFIRMED_OPEN
}
