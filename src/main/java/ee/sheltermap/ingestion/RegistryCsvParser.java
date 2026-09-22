package ee.sheltermap.ingestion;

import ee.sheltermap.app.TextTruncation;

import java.util.ArrayList;
import java.util.List;

/**
 * Parser for the Päästeamet open-data shelter CSV
 * ({@code https://opendata.smit.ee/gis/varjumiskohad.csv}, official-dataset-csv).
 *
 * <p>Format (verified against the live file): UTF-8, semicolon-separated,
 * header {@code id;nimi;aadress;lest_x;lest_y}, fields double-quoted in the
 * live file (addresses contain commas — the delimiter is the semicolon,
 * never the comma). The header is validated quote-aware, so the same five
 * column names are accepted whether or not the fields are quoted. Coordinates are EPSG:3301 (L-EST97) meters; the mapping to WGS84
 * happens in the client via {@link LEst97Transformer}.
 *
 * <p>Malformed ROWS are dropped and counted (the import's "skipped"
 * semantics) — a bad row never aborts the run. A malformed HEADER does:
 * the file is not the dataset we expect, and storing it would corrupt
 * provenance, so the run fails as a deterministic (no-retry) registry
 * failure.
 */
public final class RegistryCsvParser {

    /** The five expected header column names, in order. */
    private static final List<String> EXPECTED_COLUMNS =
            List.of("id", "nimi", "aadress", "lest_x", "lest_y");

    private RegistryCsvParser() {
    }

    /** One usable CSV row (raw L-EST97 values, not yet transformed). */
    public record Row(String externalId, String name, String address,
                      double lestX, double lestY) {
    }

    /** @param rows parsed rows; @param dropped non-empty rows that were unusable */
    public record Parsed(List<Row> rows, int dropped) {
    }

    /**
     * @throws IllegalArgumentException when the header line is not
     *         {@code id;nimi;aadress;lest_x;lest_y} (after BOM/trim, with
     *         the header fields optionally double-quoted, as the live file
     *         serves them) — callers translate that into a no-retry
     *         registry failure
     */
    public static Parsed parse(String csv) {
        if (csv == null) {
            return new Parsed(List.of(), 0);
        }
        String text = csv.stripLeading();
        if (text.startsWith("\uFEFF")) { // UTF-8 BOM
            text = text.substring(1);
        }
        String[] lines = text.split("\r?\n");
        List<Row> rows = new ArrayList<>();
        int dropped = 0;
        boolean headerSeen = false;
        for (String line : lines) {
            if (line.isBlank()) {
                continue;
            }
            if (!headerSeen) {
                if (!isExpectedHeader(line)) {
                    throw new IllegalArgumentException(
                            "unexpected CSV header: " + firstLinePreview(line));
                }
                headerSeen = true;
                continue;
            }
            List<String> fields = splitFields(line);
            Row row = toRow(fields);
            if (row == null) {
                dropped++;
            } else {
                rows.add(row);
            }
        }
        if (text.strip().isEmpty()) {
            return new Parsed(List.of(), 0);
        }
        return new Parsed(List.copyOf(rows), dropped);
    }

    /**
     * The header line, run through the same quote-aware splitter as the data
     * rows: {@code id;nimi;aadress;lest_x;lest_y} and
     * {@code "id";"nimi";"aadress";"lest_x";"lest_y"} both validate to the
     * same five names, and nothing else does. A genuinely wrong or truncated
     * header still throws — the failure must stay loud, not become lenient.
     */
    private static boolean isExpectedHeader(String line) {
        return EXPECTED_COLUMNS.equals(splitFields(line.trim()));
    }

    /**
     * Quote-aware split on ';': a field is either bare or double-quoted with
     * doubled quotes as the escape ({@code "a""b"}). Unquoted fields may not
     * contain the delimiter; a stray quote toggles quoting from there on
     * (RFC 4180 is lenient — the dataset quotes every field anyway).
     */
    static List<String> splitFields(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else if (c == '"') {
                inQuotes = true;
            } else if (c == ';') {
                fields.add(current.toString());
                current.setLength(0);
            } else {
                current.append(c);
            }
        }
        fields.add(current.toString());
        return fields;
    }

    /** One row: {@code "id";"nimi";"aadress";"x";"y"} — null when unusable. */
    private static Row toRow(List<String> fields) {
        if (fields.size() != 5) {
            return null;
        }
        String id = fields.get(0) == null ? "" : fields.get(0).trim();
        String name = fields.get(1) == null ? "" : fields.get(1).trim();
        String address = fields.get(2) == null ? "" : fields.get(2).trim();
        if (id.isEmpty() || name.isEmpty() || address.isEmpty()) {
            return null; // no id cannot dedupe/delist; blank name/address are unusable
        }
        double x = parseCoordinate(fields.get(3));
        double y = parseCoordinate(fields.get(4));
        if (Double.isNaN(x) || Double.isNaN(y)) {
            return null;
        }
        return new Row(id, name, address, x, y);
    }

    private static double parseCoordinate(String raw) {
        if (raw == null) {
            return Double.NaN;
        }
        try {
            double value = Double.parseDouble(raw.trim());
            return Double.isFinite(value) ? value : Double.NaN;
        } catch (NumberFormatException e) {
            return Double.NaN;
        }
    }

    private static String firstLinePreview(String line) {
        // strip() before truncate(): the preview is of the trimmed line;
        // TextTruncation's own trim() is then a no-op.
        return TextTruncation.truncate(line.strip(), 80);
    }
}
