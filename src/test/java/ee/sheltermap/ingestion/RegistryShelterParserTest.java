package ee.sheltermap.ingestion;

import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RegistryShelterParserTest {

    private final RegistryShelterParser parser = new RegistryShelterParser();

    private static RegistryShelterDto valid() {
        return new RegistryShelterDto("PK-1", "Tallinna varjend", "Endla 5, Tallinn",
                59.437, 24.753, 120, true,
                "Harju maakond", "Tallinn", "02.07.2026", "SMIT. Päästeameti avaandmed");
    }

    private static RegistryShelterDto with(RegistryShelterDto base,
                                           String externalId, String name, double lat, double lng) {
        return new RegistryShelterDto(externalId, name, base.address(), lat, lng,
                base.capacity(), base.accessible(), base.county(), base.municipality(),
                base.dataAsOf(), base.sourceAttribution());
    }

    @Test
    void validRowIsMappedToDomainShelterWithAllRegistryFields() {
        List<Shelter> result = parser.parse(List.of(valid()));

        assertThat(result).hasSize(1);
        Shelter shelter = result.get(0);
        assertThat(shelter.getName()).isEqualTo("Tallinna varjend");
        assertThat(shelter.getLocation().lat()).isEqualTo(59.437);
        assertThat(shelter.getLocation().lng()).isEqualTo(24.753);
        assertThat(shelter.getExternalId()).isEqualTo("PK-1");
        assertThat(shelter.getSource()).isEqualTo(ShelterSource.PAASETEAMET);
        assertThat(shelter.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(shelter.getAddress()).isEqualTo("Endla 5, Tallinn");
        assertThat(shelter.getCounty()).isEqualTo("Harju maakond");
        assertThat(shelter.getMunicipality()).isEqualTo("Tallinn");
        assertThat(shelter.getDataAsOf()).isEqualTo("02.07.2026");
        assertThat(shelter.getSourceAttribution()).isEqualTo("SMIT. Päästeameti avaandmed");
    }

    @Test
    void nameIsTrimmedAndWhitespaceCollapsed() {
        RegistryShelterDto dto = with(valid(), "PK-1", "  Tallinna   varjend\t 1  ", 59.437, 24.753);

        List<Shelter> result = parser.parse(List.of(dto));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Tallinna varjend 1");
    }

    @Test
    void latitudeOutOfRangeIsSkipped() {
        RegistryShelterDto dto = with(valid(), "PK-1", "Bad lat", 91.0, 24.753);

        assertThat(parser.parse(List.of(dto))).isEmpty();
    }

    @Test
    void longitudeOutOfRangeIsSkipped() {
        RegistryShelterDto dto = with(valid(), "PK-1", "Bad lng", 59.0, 181.0);

        assertThat(parser.parse(List.of(dto))).isEmpty();
    }

    @Test
    void outsideEstoniaBboxIsSkipped() {
        RegistryShelterDto dto = with(valid(), "PK-1", "Helsinki", 60.17, 24.94);

        assertThat(parser.parse(List.of(dto))).isEmpty();
    }

    @Test
    void blankNameIsSkipped() {
        RegistryShelterDto dto = with(valid(), "PK-1", "   ", 59.437, 24.753);

        assertThat(parser.parse(List.of(dto))).isEmpty();
    }

    @Test
    void blankExternalIdIsSkipped() {
        RegistryShelterDto dto = with(valid(), "  ", "Tallinna varjend", 59.437, 24.753);

        assertThat(parser.parse(List.of(dto))).isEmpty();
    }

    @Test
    void emptyAndNullListsYieldEmptyResult() {
        assertThat(parser.parse(List.of())).isEmpty();
        assertThat(parser.parse(null)).isEmpty();
    }

    @Test
    void mixedInputSkipsOnlyTheMalformedRows() {
        RegistryShelterDto bad = with(valid(), "PK-BAD", "Outside", 60.17, 24.94);

        List<Shelter> result = parser.parse(List.of(valid(), bad, valid()));

        assertThat(result).hasSize(2);
        // the caller derives the skipped count from the size difference
        assertThat(3 - result.size()).isEqualTo(1);
    }
}
