package ee.sheltermap.app;

/**
 * Truncation for the fixed-width audit columns (error_message is
 * 1000 chars in both data_import_log and retention_run_log): an
 * over-long value must never abort the audit write — the failure row
 * IS the failure record.
 */
public final class TextTruncation {

    private TextTruncation() {
    }

    /** {@code null} stays {@code null}; a longer value is cut to exactly {@code maxLength}. */
    public static String truncate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLength ? value : value.substring(0, maxLength);
    }
}
