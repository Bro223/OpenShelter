package ee.sheltermap.ingestion;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * {@link RegistryCsvParser}: the Päästeamet open-data CSV shape (semicolon
 * delimited, every field quoted, comma-containing addresses), BOM tolerance,
 * malformed-row drop counting, and the bad-header failure.
 */
class RegistryCsvParserTest {

    private static final String HEADER = "id;nimi;aadress;lest_x;lest_y";

    private static String csv(String... dataLines) {
        return String.join("\n", java.util.stream.Stream.concat(
                java.util.stream.Stream.of(HEADER), java.util.stream.Stream.of(dataLines))
                .toList()) + "\n";
    }

    @Test
    void parsesQuotedRowsWithCommaAddresses() {
        String body = csv(
                "\"PÕ81166\";\"Vasalemma Kogukonnamaja\";\"Harju maakond, Lääne-Harju vald, Vasalemma alevik, Ranna tee 8\";6567275.63;516551.56",
                "\"LÄ49630\";\"Tartu kelder\";\"Tartu maakond, Tartu linn, Emajõe 1\";6789000.1;7123000.4");

        RegistryCsvParser.Parsed parsed = RegistryCsvParser.parse(body);

        assertThat(parsed.dropped()).isZero();
        assertThat(parsed.rows()).hasSize(2);
        RegistryCsvParser.Row first = parsed.rows().get(0);
        assertThat(first.externalId()).isEqualTo("PÕ81166");
        assertThat(first.name()).isEqualTo("Vasalemma Kogukonnamaja");
        assertThat(first.address())
                .isEqualTo("Harju maakond, Lääne-Harju vald, Vasalemma alevik, Ranna tee 8");
        assertThat(first.lestX()).isEqualTo(6567275.63);
        assertThat(first.lestY()).isEqualTo(516551.56);
        assertThat(parsed.rows().get(1).address()).isEqualTo("Tartu maakond, Tartu linn, Emajõe 1");
    }

    @Test
    void toleratesUtf8BomAndCrlfLineEndings() {
        String body = "\uFEFF" + HEADER + "\r\n"
                + "\"ID67400\";\"Narva varjend\";\"Ida-Viru maakond, Narva linn, Suur-Sõjatee 2\";6388434.0;384655.0\r\n";

        RegistryCsvParser.Parsed parsed = RegistryCsvParser.parse(body);

        assertThat(parsed.dropped()).isZero();
        assertThat(parsed.rows()).hasSize(1);
        assertThat(parsed.rows().get(0).externalId()).isEqualTo("ID67400");
    }

    @Test
    void acceptsQuotedHeaderFromLiveSource() {
        // The live file serves every header field double-quoted.
        String body = "\"id\";\"nimi\";\"aadress\";\"lest_x\";\"lest_y\"\n"
                + "\"PÕ81166\";\"Vasalemma Kogukonnamaja\";\"Harju maakond, Lääne-Harju vald, Vasalemma alevik, Ranna tee 8\";6567275.63;516551.56\n";

        RegistryCsvParser.Parsed parsed = RegistryCsvParser.parse(body);

        assertThat(parsed.dropped()).isZero();
        assertThat(parsed.rows()).hasSize(1);
        assertThat(parsed.rows().get(0).externalId()).isEqualTo("PÕ81166");
        assertThat(parsed.rows().get(0).name()).isEqualTo("Vasalemma Kogukonnamaja");
    }

    @Test
    void acceptsUnquotedHeaderFromLegacyFormat() {
        // The previously-working unquoted header must keep parsing.
        String body = csv("\"P1\";\"A\";\"Pärnu maakond, Pärnu linn, Linnatu 1\";5100000.0;4000000.0");

        RegistryCsvParser.Parsed parsed = RegistryCsvParser.parse(body);

        assertThat(parsed.dropped()).isZero();
        assertThat(parsed.rows()).hasSize(1);
        assertThat(parsed.rows().get(0).externalId()).isEqualTo("P1");
    }

    @Test
    void dropsMalformedRowsAndCountsThem() {
        String body = csv(
                "\"LÕ41281\";\"Good row\";\"Pärnu maakond, Pärnu linn, Linnatu 1\";5100000.0;4000000.0",
                "\"\";\"No id\";\"Pärnu maakond, Pärnu linn, Linnatu 2\";5100001.0;4000001.0",
                "\"X1\";\"\";\"Pärnu maakond, Pärnu linn, Linnatu 3\";5100002.0;4000002.0",
                "\"X2\";\"Bad coords\";\"Pärnu maakond, Pärnu linn, Linnatu 4\";abc;4000003.0",
                "\"X3\";\"Too few fields\";\"Pärnu maakond, Pärnu linn\";5100004.0");

        RegistryCsvParser.Parsed parsed = RegistryCsvParser.parse(body);

        assertThat(parsed.rows()).hasSize(1);
        assertThat(parsed.rows().get(0).externalId()).isEqualTo("LÕ41281");
        assertThat(parsed.dropped()).isEqualTo(4);
    }

    @Test
    void blankLinesAreIgnoredNotDropped() {
        String body = HEADER + "\n\n"
                + "\"LÕ1\";\"A\";\"Pärnu maakond, Pärnu linn, Linnatu 1\";5100000.0;4000000.0\n\n";

        RegistryCsvParser.Parsed parsed = RegistryCsvParser.parse(body);

        assertThat(parsed.rows()).hasSize(1);
        assertThat(parsed.dropped()).isZero();
    }

    @Test
    void emptyInputYieldsNoRows() {
        assertThat(RegistryCsvParser.parse("").rows()).isEmpty();
        assertThat(RegistryCsvParser.parse("   \n  ").rows()).isEmpty();
        assertThat(RegistryCsvParser.parse(null).rows()).isEmpty();
        assertThat(RegistryCsvParser.parse("\uFEFF").rows()).isEmpty();
    }

    @Test
    void wrongHeaderFailsDeterministically() {
        String body = "id;name;address;x;y\n\"P1\";\"A\";\"a\";1.0;2.0\n";

        assertThatThrownBy(() -> RegistryCsvParser.parse(body))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unexpected CSV header");
    }

    @Test
    void truncatedHeaderFailsDeterministically() {
        String body = "id;nimi;aadress;lest_x\n\"P1\";\"A\";\"a\";1.0\n";

        assertThatThrownBy(() -> RegistryCsvParser.parse(body))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("unexpected CSV header");
    }

    @Test
    void splitFieldsHandlesQuotedEscapesAndUnquotedFields() {
        assertThat(RegistryCsvParser.splitFields("\"a\";\"b\";\"c\""))
                .containsExactly("a", "b", "c");
        assertThat(RegistryCsvParser.splitFields("\"a\"\"b\";\"c\""))
                .containsExactly("a\"b", "c");
        assertThat(RegistryCsvParser.splitFields("a;b;c"))
                .containsExactly("a", "b", "c");
        assertThat(RegistryCsvParser.splitFields("\"Harju maakond, Tallinn\";\"x\""))
                .containsExactly("Harju maakond, Tallinn", "x");
        assertThat(RegistryCsvParser.splitFields("")).containsExactly("");
        assertThat(RegistryCsvParser.splitFields("a;")).containsExactly("a", "");
    }

    @Test
    void threeSegmentAddressParses() {
        String body = csv("\"P1\";\"A\";\"Harju maakond, Tallinn\";540000.0;6580000.0");
        List<RegistryCsvParser.Row> rows = RegistryCsvParser.parse(body).rows();
        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).address()).isEqualTo("Harju maakond, Tallinn");
    }
}
