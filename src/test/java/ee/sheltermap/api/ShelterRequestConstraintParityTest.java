package ee.sheltermap.api;

import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.Test;

import java.lang.annotation.Annotation;
import java.lang.reflect.Method;
import java.lang.reflect.RecordComponent;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Drift guard: {@link CreateShelterRequest}
 * and {@link UpdateShelterRequest} must carry field-for-field IDENTICAL
 * validation constraints — create and update share the same bounds and bbox
 * gate, so a change to one must show up here.
 *
 * <p>The constraints are read from each component's
 * BACKING FIELD, never from {@link RecordComponent#getAnnotations()}. Jakarta's
 * constraints do not target {@code RECORD_COMPONENT}, so javac propagates them
 * to the field, the constructor parameter and the accessor only — the record
 * component itself carries nothing. Reading the components would compare two
 * empty maps and pass vacuously: it could catch no drift at all. The field is
 * also what Bean Validation reads at runtime.
 *
 * <p>Three assertions, deliberately: the parity check (drift between create and
 * update), the absolute bound set (drift away from the documented limits), and a
 * non-vacuity check (a future revert to the component read must fail loudly
 * instead of going quiet again).
 */
class ShelterRequestConstraintParityTest {

    @Test
    void updateRequestCarriesIdenticalConstraintsAsCreateRequest() {
        assertThat(constraints(UpdateShelterRequest.class))
                .as("every UpdateShelterRequest field must expose exactly the CreateShelterRequest constraints")
                .isEqualTo(constraints(CreateShelterRequest.class));
    }

    /**
     * The real bounds, hard-coded from the records: house number style name
     * (200), WGS84 bbox on both coordinates, description 2000, capacity
     * 1…100 000. Removing or widening any of them fails here.
     */
    @Test
    void createRequestCarriesTheDocumentedBounds() {
        assertThat(constraints(CreateShelterRequest.class)).isEqualTo(Map.of(
                "name", "NotBlank(); Size(max=200)",
                "latitude", "DecimalMax(inclusive=true, value=90); DecimalMin(inclusive=true, value=-90)",
                "longitude", "DecimalMax(inclusive=true, value=180); DecimalMin(inclusive=true, value=-180)",
                "description", "Size(max=2000)",
                "capacity", "Max(value=100000); Min(value=1)",
                "locationKind", ""));
    }

    /**
     * The trap this guard fell into once, made explicit: the reflection must
     * actually SEE constraints, and the record components must be empty — which
     * is exactly why the backing field is the source of truth here.
     */
    @Test
    void constraintsAreReadFromFieldsBecauseRecordComponentsCarryNone() {
        assertThat(constraints(CreateShelterRequest.class).values())
                .as("the reflection must see the jakarta constraints, or this guard is vacuous")
                .anyMatch(description -> !description.isEmpty());

        assertThat(Arrays.stream(CreateShelterRequest.class.getRecordComponents())
                .flatMap(component -> Arrays.stream(component.getAnnotations())))
                .as("RecordComponent#getAnnotations() is empty for jakarta constraints — "
                        + "the reason this guard reads the backing field")
                .isEmpty();
    }

    /** name -> sorted constraint descriptions (bound attributes included). */
    private static Map<String, String> constraints(Class<?> recordType) {
        return Arrays.stream(recordType.getRecordComponents())
                .collect(Collectors.toUnmodifiableMap(
                        RecordComponent::getName,
                        component -> {
                            try {
                                return Arrays.stream(recordType
                                                .getDeclaredField(component.getName())
                                                .getAnnotations())
                                        .filter(ShelterRequestConstraintParityTest::isConstraint)
                                        .map(ShelterRequestConstraintParityTest::describe)
                                        .sorted()
                                        .collect(Collectors.joining("; "));
                            } catch (NoSuchFieldException e) {
                                throw new IllegalStateException(
                                        "no backing field for " + component.getName(), e);
                            }
                        }));
    }

    private static boolean isConstraint(Annotation annotation) {
        String name = annotation.annotationType().getName();
        return name.startsWith("jakarta.validation.constraints.");
    }

    /**
     * Only the validation-semantic attributes are described — the message text
     * is not part of the bound this guard pins. {@code Size} prints its bounds
     * in the conventional short form ({@code Size(min=8, max=200)}, omitting
     * either default); every other constraint prints its declared attributes,
     * so the coordinate bounds and the capacity range are pinned by value.
     */
    private static String describe(Annotation annotation) {
        if (annotation instanceof Size size) {
            StringBuilder sb = new StringBuilder("Size(");
            if (size.min() > 0) {
                sb.append("min=").append(size.min()).append(", ");
            }
            if (size.max() != Integer.MAX_VALUE) {
                sb.append("max=").append(size.max());
            }
            return sb.append(')').toString();
        }
        List<String> attributes = new ArrayList<>();
        for (Method method : annotation.annotationType().getDeclaredMethods()) {
            String name = method.getName();
            if (name.equals("message") || name.equals("groups") || name.equals("payload")) {
                continue;
            }
            Object value;
            try {
                value = method.invoke(annotation);
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("unreadable annotation attribute " + name, e);
            }
            attributes.add(name + "=" + value);
        }
        Collections.sort(attributes);
        return annotation.annotationType().getSimpleName() + "(" + String.join(", ", attributes) + ")";
    }
}
