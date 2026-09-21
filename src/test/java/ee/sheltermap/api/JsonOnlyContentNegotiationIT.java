package ee.sheltermap.api;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Content negotiation is part of the published interface: every one of the
 * 64 operations in {@code docs/api/openapi.json} declares
 * {@code application/json} only, so a browser-style {@code Accept} must not
 * switch the wire form to XML/XHTML (backend review 06, finding 1 — the
 * canned response answered {@code 200 application/xhtml+xml} with an XML
 * body, errors included).
 *
 * <p>The XML wire form came from Boot's
 * {@code MappingJackson2XmlHttpMessageConverter}, which auto-configures
 * exactly when {@code com.fasterxml.jackson.dataformat.xml.XmlMapper} is on
 * the classpath. With that converter gone, the all-types entry of the
 * browser Accept (q=0.8) is the best match for the JSON converter, so the answer is
 * {@code 200 application/json} — not 406 (the Accept is satisfiable).
 */
@AutoConfigureMockMvc
class JsonOnlyContentNegotiationIT extends AbstractPersistenceIT {

    /** The browser Accept the review recorded, q-values included. */
    private static final String BROWSER_ACCEPT =
            "application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

    @Autowired
    MockMvc mvc;

    @Test
    void sheltersAnswerJsonToABrowserAccept() throws Exception {
        assertJsonOnly("/api/shelters");
    }

    @Test
    void guidanceAnswersJsonToABrowserAccept() throws Exception {
        assertJsonOnly("/api/guidance");
    }

    private void assertJsonOnly(String path) throws Exception {
        MvcResult result = mvc.perform(get(path).header(HttpHeaders.ACCEPT, BROWSER_ACCEPT))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(result.getResponse().getContentType())
                .as("Content-Type of GET %s for Accept: %s", path, BROWSER_ACCEPT)
                .startsWith(MediaType.APPLICATION_JSON_VALUE);
    }
}
