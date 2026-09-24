package ee.sheltermap.domain;

/**
 * The provenance taxonomy — the single
 * server-side answer to "where does this row come from, and what is its
 * standing?". Derived at read time from the row's stored fields — never
 * stored, never client-computed.
 *
 * <p>Derivation precedence (first match wins):
 * <ol>
 *   <li>{@link #REJECTED} — the admin REJECT ({@code review_status =
 *       REJECTED}); the most specific statement the app has about the row.
 *   <li>{@link #REPORTED_INACTIVE} — an {@code INACTIVE} row with at least
 *       {@link ShelterReport#AUTO_HIDE_THRESHOLD} open reports of EITHER
 * report kind (the report semantics): the
 *       {@code NON_EXISTENT} count (the auto-hide path) or the
 *       "inaccurate information" count ({@code WRONG_LOCATION} +
 *       {@code OTHER} — the community's "this data is wrong" reports).
 *       Dismissed reports count in neither — the count is over open
 *       reports, exactly as the DTO's published counts are.</li>
 *   <li>{@link #OFFICIAL} — registry-imported rows
 *       ({@code source = PAASETEAMET}).
 *   <li>{@link #PARTNER_VERIFIED} — partner-fed rows
 *       ({@code source = MUNICIPALITY}).
 *   <li>{@link #UNDER_REVIEW} — community rows the trust lifecycle has not
 *       confirmed yet ({@code source = USER} + {@code review_status = NEW}).
 *   <li>{@link #COMMUNITY_REPORTED} — everything else (confirmed community
 *       rows; pre-V7 legacy rows land here when {@code USER}).
 * </ol>
 *
 * <p>Only the first four values are reachable in the ACTIVE-only public
 * list: {@code REJECTED} and {@code REPORTED_INACTIVE} rows are
 * {@code INACTIVE} and therefore absent there — the values still ride on
 * the DTO for the owner list ({@code /mine}) and the admin list, where
 * hidden rows are visible.
 */
public enum Provenance {
    OFFICIAL,
    PARTNER_VERIFIED,
    COMMUNITY_REPORTED,
    UNDER_REVIEW,
    REPORTED_INACTIVE,
    REJECTED;

    /**
     * Derives the provenance of one row.
     *
     * @param source              the row's {@code source} column
     * @param reviewStatus        the row's {@code review_status} column
     * @param status              the row's lifecycle {@code status}
     * @param nonexistentReports  the row's live open {@code NON_EXISTENT}
     *                            report count (0 when none)
     * @param inaccurateReports   the row's live open "inaccurate
     *                            information" report count
     *                            ({@code WRONG_LOCATION} + {@code OTHER};
     * 0 when none) — EITHER kind drives
     *                            the reported state
     */
    public static Provenance of(ShelterSource source, ReviewStatus reviewStatus,
                                ShelterStatus status, long nonexistentReports,
                                long inaccurateReports) {
        if (reviewStatus == ReviewStatus.REJECTED) {
            return REJECTED;
        }
        if (status == ShelterStatus.INACTIVE
                && (nonexistentReports >= ShelterReport.AUTO_HIDE_THRESHOLD
                        || inaccurateReports >= ShelterReport.AUTO_HIDE_THRESHOLD)) {
            return REPORTED_INACTIVE;
        }
        if (source == ShelterSource.PAASETEAMET) {
            return OFFICIAL;
        }
        if (source == ShelterSource.MUNICIPALITY) {
            return PARTNER_VERIFIED;
        }
        if (reviewStatus == ReviewStatus.NEW) {
            return UNDER_REVIEW;
        }
        return COMMUNITY_REPORTED;
    }
}
