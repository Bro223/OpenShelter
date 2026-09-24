package ee.sheltermap.app;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * The compact {@code changes} JSON of a shelter_history EDITED row
 * (moderation-dashboard-completion):
 * {@code {"field": [old, new], ...}} over exactly the fields that MOVED on a
 * PUT, in canonical field order (name, description, capacity, latitude,
 * longitude, locationKind).
 *
 * <p>Serialization happens at write time ({@link ShelterService#updatePlace}
 * builds the moved-field map); the admin projection parses it back into
 * render-ready {@link ShelterHistoryLog.FieldChange} tuples — the frontend
 * renders, never parses. Values are display primitives (strings, numbers);
 * an absent value is JSON null (e.g. a first-set description).
 */
public final class ShelterHistoryChanges {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ShelterHistoryChanges() {
    }

    /**
     * Serializes the moved-field map to the compact JSON document.
     *
     * @param moved field → [old, new] (each side may be null); iteration
     *              order is preserved in the JSON
     * @throws IllegalStateException if the map is empty (a no-op PUT must
     *                               record no row in the first place)
     */
    public static String toJson(Map<String, Object[]> moved) {
        Objects.requireNonNull(moved, "moved");
        if (moved.isEmpty()) {
            throw new IllegalStateException("a no-op edit has no history row");
        }
        try {
            return MAPPER.writeValueAsString(moved);
        } catch (JsonProcessingException e) {
            // The map holds only strings/numbers/arrays — serialization
            // cannot fail; anything else is a programming error.
            throw new IllegalStateException("unserializable history changes", e);
        }
    }

    /**
     * Parses the stored JSON back into render-ready tuples in stored order.
     *
     * @return an empty list for {@code null}/blank (CREATED/DELETED rows)
     * @throws IllegalStateException on malformed stored JSON (a corrupt row
     *                               is a programming error, never a 500
     *                               surface with a raw stack)
     */
    public static List<ShelterHistoryLog.FieldChange> parse(String changesJson) {
        if (changesJson == null || changesJson.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = MAPPER.readTree(changesJson);
            List<ShelterHistoryLog.FieldChange> changes = new ArrayList<>();
            root.fields().forEachRemaining(entry -> {
                JsonNode pair = entry.getValue();
                changes.add(new ShelterHistoryLog.FieldChange(
                        entry.getKey(), display(pair.path(0)), display(pair.path(1))));
            });
            return List.copyOf(changes);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("corrupt history changes JSON", e);
        }
    }

    /** A JSON value as its display string; absent/null → null. */
    private static String display(JsonNode value) {
        if (value == null || value.isNull() || value.isMissingNode()) {
            return null;
        }
        return value.isTextual() ? value.asText() : value.toString();
    }
}
