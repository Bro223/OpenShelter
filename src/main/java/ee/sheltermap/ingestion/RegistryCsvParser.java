package ee.sheltermap.ingestion;

import ee.sheltermap.app.TextTruncation;

import java.util.ArrayList;
import java.util.List;

/**
 * Parser for the Päästeamet open-data shelter CSV
 * ({@code https://opendata.smit.ee/gis/varjumiskohad.csv}).
 *
 * <p>Format (verified against the live file): UTF-8, semicolon-separated,
 * header {@code id;nimi;aadress;tyyp;lest_x;lest_y} since the publisher
 * added the {@code tyyp} (type) column (verified 2026-10); the earlier
 * {@code id;nimi;aadress;lest_x;lest_y} shape is still accepted. Fields are
 * double-quoted in the live file (addresses contain commas — the delimiter
 * is the semicolon, never the comma). The header is validated quote-aware,
 * so each known column set is accepted whether or not the fields are quoted.
 * {@code tyyp} carries the publisher's shelter type, which the app's shelter
 * model does not store — its value is parsed away, never persisted.
 * Coordinates are EPSG:3301 (L-EST97) meters; the mapping to WGS84
 * happens in the client via {@link LEst97Transformer}.
 *
 * <p>Malformed ROWS are dropped and counted (the import's "skipped"
 * semantics) — a bad row never aborts the run. A malformed HEADER does:
 * the file is not the dataset we expect, and storing it would corrupt
 * provenance, so the run fails as a deterministic (no-retry) registry
 * failure.
 */
public final class RegistryCsvParser {

    /** The original five expected header column names, in order. */
    private static final List<String> EXPECTED_COLUMNS_FIVE =
            List.of("id", "nimi", "aadress", "lest_x", "lest_y");

    /** The current live header: the publisher inserted the {@code tyyp}
     *  (type) column after {@code aadress} (verified 2026-10). */
    private static final List<String> EXPECTED_COLUMNS_SIX =
            List.of("id", "nimi", "aadress", "tyyp", "lest_x", "lest_y");

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
        List<Row> rows = new ArrayList<>();
        int dropped = 0;
        for (String line : dataLinesAfterHeader(text)) {
            Row row = toRow(splitFields(line));
            if (row == null) {
                dropped++;
            } else {
                rows.add(row);
            }
        }
        return new Parsed(List.copyOf(rows), dropped);
    }

    /**
     * The non-blank data lines after the header. The first non-blank line
     * must be the expected header — a wrong or truncated one throws (the
     * file is not the dataset, so the run must fail deterministically);
     * blank lines before the header and between rows are ignored.
     */
    private static List<String> dataLinesAfterHeader(String text) {
        List<String> data = new ArrayList<>();
        boolean headerSeen = false;
        for (String line : text.split("\r?\n")) {
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
            data.add(line);
        }
        return data;
    }

    /**
     * The header line, run through the same quote-aware splitter as the data
     * rows: each known column set validates the same whether or not the
     * fields are double-quoted, as the live file serves them, and nothing
     * else does — in particular a {@code tyyp} column in any other position
     * is a different dataset shape and must still fail. A genuinely wrong or
     * truncated header throws — the failure must stay loud, not lenient.
     */
    private static boolean isExpectedHeader(String line) {
        List<String> columns = splitFields(line.trim());
        return EXPECTED_COLUMNS_FIVE.equals(columns)
                || EXPECTED_COLUMNS_SIX.equals(columns);
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

    /**
     * One row — null when unusable. Two shapes follow the two accepted
     * headers: the legacy {@code "id";"nimi";"aadress";"x";"y"} and the
     * current {@code "id";"nimi";"aadress";"tyyp";"x";"y"}, where the
     * {@code tyyp} (type) value is intentionally dropped — the shelter
     * model has no type column, and persisting it would be a schema
     * decision, not a parsing one.
     */
    private static Row toRow(List<String> fields) {
        int xIndex;
        int yIndex;
        if (fields.size() == EXPECTED_COLUMNS_FIVE.size()) {
            xIndex = 3;
            yIndex = 4;
        } else if (fields.size() == EXPECTED_COLUMNS_SIX.size()) {
            xIndex = 4;
            yIndex = 5;
        } else {
            return null;
        }
        String id = fields.get(0).trim();
        String name = fields.get(1).trim();
        String address = fields.get(2).trim();
        if (id.isEmpty() || name.isEmpty() || address.isEmpty()) {
            return null; // no id cannot dedupe/delist; blank name/address are unusable
        }
        double x = parseCoordinate(fields.get(xIndex));
        double y = parseCoordinate(fields.get(yIndex));
        if (Double.isNaN(x) || Double.isNaN(y)) {
            return null;
        }
        return new Row(id, name, address, x, y);
    }

    private static double parseCoordinate(String raw) {
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
