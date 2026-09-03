package ee.sheltermap.ingestion;

import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Default registry parser: validates coordinates (WGS84 range + Estonia
 * bounding-box sanity check), normalizes names (trim / collapse whitespace),
 * and maps to {@code source = PAASETEAMET}, {@code status = ACTIVE}.
 *
 * <p>Malformed rows are skipped silently — the import service counts them as
 * {@code dtos.size() - parsed.size()}. Nothing here is ever fatal.
 */
@Service
public class RegistryShelterParser implements ShelterParser {

    @Override
    public List<Shelter> parse(List<RegistryShelterDto> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return List.of();
        }
        List<Shelter> result = new ArrayList<>(dtos.size());
        for (RegistryShelterDto dto : dtos) {
            Shelter shelter = tryParse(dto);
            if (shelter != null) {
                result.add(shelter);
            }
        }
        return result;
    }

    private static Shelter tryParse(RegistryShelterDto dto) {
        if (dto == null) {
            return null;
        }
        String name = normalizeName(dto.name());
        if (name.isEmpty()) {
            return null; // blank name — skip
        }
        String externalId = dto.externalId() == null ? "" : dto.externalId().trim();
        if (externalId.isEmpty()) {
            return null; // no id — cannot dedupe or delist — skip
        }
        if (!validCoordinates(dto.latitude(), dto.longitude())) {
            return null; // out of WGS84 range — skip
        }
        if (!GeoPoint.inEstonia(dto.latitude(), dto.longitude())) {
            return null; // outside Estonia bbox — skip
        }
        return new Shelter(name, new GeoPoint(dto.latitude(), dto.longitude()),
                ShelterStatus.ACTIVE, externalId, ShelterSource.PAASETEAMET,
                dto.address(), dto.county(), dto.municipality(), dto.dataAsOf(), dto.sourceAttribution());
    }

    /** Trims and collapses internal whitespace runs into single spaces. */
    static String normalizeName(String name) {
        if (name == null) {
            return "";
        }
        return name.trim().replaceAll("\\s+", " ");
    }

    private static boolean validCoordinates(double lat, double lng) {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

}
