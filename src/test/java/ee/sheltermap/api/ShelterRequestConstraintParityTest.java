package ee.sheltermap.api;

import org.junit.jupiter.api.Test;

import java.lang.annotation.Annotation;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Drift guard (user-contributions review nit N4): {@link CreateShelterRequest}
 * and {@link UpdateShelterRequest} must carry field-for-field IDENTICAL
 * validation constraints — create and update share the same bounds and bbox
 * gate, so a change to one must show up here.
 */
class ShelterRequestConstraintParityTest {

    @Test
    void updateRequestCarriesIdenticalConstraintsAsCreateRequest() {
        assertThat(constraints(UpdateShelterRequest.class))
                .as("every UpdateShelterRequest field must expose exactly the CreateShelterRequest constraints")
                .isEqualTo(constraints(CreateShelterRequest.class));
    }

    /** name -> ordered list of constraint annotations (class + attributes). */
    private static Map<String, String> constraints(Class<?> recordType) {
        return Arrays.stream(recordType.getRecordComponents())
                .collect(Collectors.toUnmodifiableMap(
                        RecordComponent::getName,
                        component -> Arrays.stream(component.getAnnotations())
                                .filter(ShelterRequestConstraintParityTest::isConstraint)
                                .map(ShelterRequestConstraintParityTest::describe)
                                .sorted()
                                .collect(Collectors.joining("; "))));
    }

    private static boolean isConstraint(Annotation annotation) {
        String name = annotation.annotationType().getName();
        return name.startsWith("jakarta.validation.constraints.");
    }

    /** e.g. {@code Size(max=200)} — attribute values included, order irrelevant. */
    private static String describe(Annotation annotation) {
        StringBuilder sb = new StringBuilder(annotation.annotationType().getSimpleName()).append('(');
        for (java.lang.reflect.Method method : annotation.annotationType().getMethods()) {
            Object value;
            try {
                value = method.invoke(annotation);
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException("unreadable annotation attribute " + method.getName(), e);
            }
            sb.append(method.getName()).append('=').append(value).append(',');
        }
        return sb.append(')').toString();
    }
}
