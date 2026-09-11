package ee.sheltermap.domain;

/**
 * Why a community review is reported (shelter-trust-and-reports D2).
 * 5 reports hide the review ({@code shelter_reviews.hidden_at}); only an
 * admin can restore it (later change).
 */
public enum ReviewReportReason {
    FALSY_DATA,
    NOT_RELEVANT,
    SPAM,
    OTHER
}
