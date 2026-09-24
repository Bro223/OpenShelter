package ee.sheltermap.app;

/**
 * Unknown report id in the admin moderation API (admin-moderation) —
 * mapped to 404, the same vocabulary as the unknown shelter/report ids.
 */
public class ReportNotFoundException extends RuntimeException {
    public ReportNotFoundException(long reportId) {
        super("Report not found: " + reportId);
    }
}
