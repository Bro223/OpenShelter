package ee.sheltermap.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

import ee.sheltermap.app.DuplicateInfoRequestException;
import ee.sheltermap.app.DuplicateReportException;
import ee.sheltermap.app.ImportOwnedShelterException;
import ee.sheltermap.app.InfoRequestAlreadyAnsweredException;
import ee.sheltermap.app.NonSuspendableUserException;
import ee.sheltermap.app.ShelterDuplicateException;
import ee.sheltermap.app.ShelterLimitExceededException;
import ee.sheltermap.auth.DuplicateAccountException;
import ee.sheltermap.auth.InvalidContactChangeException;
import ee.sheltermap.auth.InvalidResetTokenException;
import ee.sheltermap.auth.VerificationFailedException;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.guidance.GuidanceValidationException;
import ee.sheltermap.guidance.MediaAssetInUseException;
import ee.sheltermap.guidance.SlugAlreadyUsedException;
import ee.sheltermap.guidance.UnsupportedImageException;
import ee.sheltermap.verification.AlreadyVerifiedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Dispatch pin for the two merged handler families in
 * {@link ApiErrorHandler}: the plain-400 group ({@code badRequest}) and
 * the 409 group ({@code conflict}). Every member class must resolve
 * through the real advice to its status with the thrower's own message —
 * a grouping that drops a class from its annotation list silently demotes
 * it to the catch-all 500, and this fails on that. Standalone MockMvc
 * (the same idiom as {@link ApiErrorHandlerClientErrorsMvcTest}): no
 * Spring context, no database.
 */
class ApiErrorHandlerMappingTest {

    private final StubThrowingController controller = new StubThrowingController();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
        // Explicit JSON converter: the classpath also carries
        // jackson-dataformat-xml (via swagger-core), and this Spring
        // build's standalone defaults order the XML converter first —
        // the app's real converters (Boot) answer JSON.
        mvc = MockMvcBuilders.standaloneSetup(controller)
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .setControllerAdvice(new ApiErrorHandler(clock))
                .build();
    }

    @Test
    void thePlain400FamilyKeepsTheThrowersMessage() throws Exception {
        assertCase("invalidResetToken", new InvalidResetTokenException(), 400);
        assertCase("verificationFailed", new VerificationFailedException("the code expired"), 400);
        assertCase("invalidContactChange", new InvalidContactChangeException("no pending request"), 400);
        assertCase("invalidShelter", new InvalidShelterException("coordinates outside Estonia"), 400);
        assertCase("pagingBounds", new PagingBoundsException("limit must be between 1 and 200"), 400);
        assertCase("guidanceValidation", new GuidanceValidationException("title is required"), 400);
        assertCase("unsupportedImage", new UnsupportedImageException(), 400);
    }

    @Test
    void the409FamilyKeepsTheThrowersMessage() throws Exception {
        assertCase("duplicateAccount",
                new DuplicateAccountException(DuplicateAccountException.DUPLICATE_EMAIL_MESSAGE), 409);
        assertCase("duplicateReport", new DuplicateReportException(), 409);
        assertCase("shelterLimit", new ShelterLimitExceededException(), 409);
        assertCase("shelterDuplicate", new ShelterDuplicateException(42), 409);
        assertCase("alreadyVerified", new AlreadyVerifiedException(VerificationLevel.EMAIL), 409);
        assertCase("slugAlreadyUsed", new SlugAlreadyUsedException("my-slug"), 409);
        assertCase("mediaAssetInUse", new MediaAssetInUseException(List.of("Post A / slug-a")), 409);
        assertCase("importOwnedShelter", new ImportOwnedShelterException("registry row 7"), 409);
        assertCase("nonSuspendableUser", new NonSuspendableUserException("kind cannot be suspended"), 409);
        assertCase("duplicateInfoRequest", new DuplicateInfoRequestException(), 409);
        assertCase("infoRequestAlreadyAnswered", new InfoRequestAlreadyAnsweredException(), 409);
    }

    /** Throws the given exception through the real advice and pins status + message. */
    private void assertCase(String label, RuntimeException exception, int expectedStatus) throws Exception {
        controller.nextException = exception;
        mvc.perform(post("/throw").param("label", label))
                .andExpect(jsonPath("$.status").value(expectedStatus))
                .andExpect(jsonPath("$.message").value(exception.getMessage()));
    }

    /** One endpoint that throws whatever the test queued (same thread). */
    @RestController
    @RequestMapping("/throw")
    static class StubThrowingController {

        RuntimeException nextException = new IllegalStateException("no exception queued");

        @PostMapping
        String throwIt(@RequestParam("label") String label) {
            throw nextException;
        }
    }
}
