package ee.sheltermap.domain;

/**
 * How open a shelter is, per the reporter (live open/closed state — same
 * level as capacity). Display-only — open/closed taps never affect
 * visibility, status, markers or filters; they degrade to silence once no
 * tap is fresh (≤ 2 h).
 */
public enum OpenStatusState {
    OPEN,
    CLOSED
}
