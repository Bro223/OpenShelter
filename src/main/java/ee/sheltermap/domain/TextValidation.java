package ee.sheltermap.domain;

/**
 * The required-text rule shared by the guidance value objects
 * ({@link GuidancePost}, {@link GuidanceTranslation}) — one spelling of
 * "null or blank is a validation error, named after the field".
 */
final class TextValidation {

    private TextValidation() {
    }

    static String requireText(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " is required");
        }
        return value;
    }
}
