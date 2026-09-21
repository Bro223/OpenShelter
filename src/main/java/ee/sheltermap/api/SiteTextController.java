package ee.sheltermap.api;

import ee.sheltermap.domain.SiteText;
import ee.sheltermap.sitetexts.SiteTextKeys;
import ee.sheltermap.sitetexts.SiteTextsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * The public site-text read (site_texts): the admin overrides for the
 * accessibility popup, header and footer copy — public (no JWT), because
 * it IS the copy every visitor sees. The body is locale → key → entry
 * (an absent key = the shipped i18n catalog default — the frontend's
 * overlay applies it in I18nService, the single lookup seam).
 */
@Tag(name = "Site texts",
        description = "The public read of the admin-editable popup/header/footer "
                + "texts (site_texts). Public (no JWT): the overrides are public "
                + "copy — the same text every visitor sees.")
@RestController
@RequestMapping(value = "/api/site-texts", produces = MediaType.APPLICATION_JSON_VALUE)
public class SiteTextController {

    private final SiteTextsService siteTexts;

    public SiteTextController(SiteTextsService siteTexts) {
        this.siteTexts = siteTexts;
    }

    @GetMapping
    @Operation(summary = "The current admin overrides for the site texts",
            description = "locale → key → {value, url?}. The three locale keys "
                    + "(en/et/ru) are always present (an empty map = every "
                    + "shipped catalog default). Absent key = the frontend "
                    + "catalog default. `url` exists only for the two footer "
                    + "source-link keys (https).")
    @ApiResponse(responseCode = "200", description = "The overrides by locale",
            content = @Content(schema = @Schema(
                    implementation = Map.class)))
    @SecurityRequirements({})
    public ResponseEntity<Map<String, Map<String, SiteTextEntryDto>>> siteTexts() {
        Map<String, Map<String, SiteTextEntryDto>> body = new LinkedHashMap<>();
        for (String locale : SiteTextKeys.LOCALES) {
            Map<String, SiteTextEntryDto> perKey = new LinkedHashMap<>();
            for (Map.Entry<String, SiteText> entry :
                    siteTexts.getAll().get(locale).entrySet()) {
                SiteText text = entry.getValue();
                perKey.put(entry.getKey(),
                        new SiteTextEntryDto(text.getValue(), text.getUrl()));
            }
            body.put(locale, perKey);
        }
        return ResponseEntity.ok(body);
    }
}
