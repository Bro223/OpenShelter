package ee.sheltermap.auth;

import jakarta.validation.constraints.Size;
import org.junit.jupiter.api.Test;

import java.lang.annotation.Annotation;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Drift guard for the auth payload bounds: the
 * seven auth request records must carry the boundary {@code @Size} caps —
 * email/emailOrPhone 255 (V1 column), password 200, code 16, refreshToken
 * 512 — so an oversized payload is a 400 at the input layer and never an
 * unbounded string reaching Argon2 behind the request-count limiter.
 *
 * <p>Modelled on {@code api.ShelterRequestConstraintParityTest}: the
 * constraints are reflected off the record components, so removing or
 * shrinking any cap fails here.
 */
class AuthRequestConstraintParityTest {

    @Test
    void loginRequestCapsContactAndPassword() {
        assertConstraints(LoginRequest.class, Map.of(
                "emailOrPhone", "NotBlank(); Size(max=255)",
                "password", "NotBlank(); Size(max=200)"));
    }

    @Test
    void registerRequestCapsMirrorTheV1Columns() {
        assertConstraints(RegisterRequest.class, Map.of(
                "name", "NotBlank(); Size(max=255)",
                "email", "Email(); NotBlank(); Size(max=255)",
                "phone", "NotBlank(); Size(max=64)",
                "password", "NotBlank(); Size(min=8, max=200)"));
    }

    @Test
    void profileUpdateRequestCapsNameAndCurrentPassword() {
        assertConstraints(ProfileUpdateRequest.class, Map.of(
                "name", "NotBlank(); Size(max=255)",
                "currentPassword", "NotBlank(); Size(max=200)"));
    }

    @Test
    void passwordResetConfirmRequestCapsEmailCodeAndNewPassword() {
        assertConstraints(PasswordResetConfirmRequest.class, Map.of(
                "email", "Email(); NotBlank(); Size(max=255)",
                "code", "NotBlank(); Size(max=16)",
                "newPassword", "NotBlank(); Size(min=8, max=200)"));
    }

    @Test
    void confirmChangeRequestCapsTheCode() {
        assertConstraints(ConfirmChangeRequest.class, Map.of(
                "code", "NotBlank(); Size(max=16)"));
    }

    @Test
    void verifyConfirmRequestCapsTheCode() {
        assertConstraints(VerifyConfirmRequest.class, Map.of(
                "level", "NotNull()",
                "code", "NotBlank(); Size(max=16)"));
    }

    @Test
    void refreshRequestCapsTheRefreshToken() {
        assertConstraints(RefreshRequest.class, Map.of(
                "refreshToken", "NotBlank(); Size(max=512)"));
    }

    private static void assertConstraints(Class<?> recordType, Map<String, String> expected) {
        assertThat(constraints(recordType))
                .as("every %s field must expose exactly the bounded constraint set",
                        recordType.getSimpleName())
                .isEqualTo(expected);
    }

    /**
     * name -> sorted constraint descriptions (bound attributes included).
     *
     * <p>Read from the backing FIELD, not the record component: Jakarta's
     * {@code @NotBlank}/{@code @Size} do not target {@code RECORD_COMPONENT},
     * so javac propagates them to the field, the constructor parameter and
     * the accessor - {@code RecordComponent#getAnnotations()} is empty for
     * them. The field is also what Bean Validation reads at runtime.
     */
    private static Map<String, String> constraints(Class<?> recordType) {
        return Arrays.stream(recordType.getRecordComponents())
                .collect(Collectors.toUnmodifiableMap(
                        RecordComponent::getName,
                        component -> {
                            try {
                                return Arrays.stream(recordType
                                                .getDeclaredField(component.getName())
                                                .getAnnotations())
                                        .filter(AuthRequestConstraintParityTest::isConstraint)
                                        .map(AuthRequestConstraintParityTest::describe)
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
     * Only the validation-semantic attributes are described: the
     * {@code Size} bounds ({@code Size(min=8, max=200)}) — the message text
     * is not part of the bound this guard pins; the other constraints are
     * name-only.
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
        return annotation.annotationType().getSimpleName() + "()";
    }
}
