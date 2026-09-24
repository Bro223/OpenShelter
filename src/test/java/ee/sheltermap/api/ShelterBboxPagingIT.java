package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The viewport filter and paging of the public list (shelter-bbox-paging):
 * the parameters are optional and backward compatible, the box is
 * inclusive, the pages are deterministic over the stable id-ascending
 * order and tile the filtered list without overlap or skips, and every
 * bad value is a 400 with the uniform {@link ErrorResponse} body.
 */
@AutoConfigureMockMvc
@Transactional
class ShelterBboxPagingIT extends AbstractPersistenceIT {

    /** A box around (58.5, 25.0) — the seeded fixtures live on or around its edges. */
    private static final double MIN_LAT = 57.999;
    private static final double MIN_LNG = 23.0;
    private static final double MAX_LAT = 59.2;
    private static final double MAX_LNG = 27.0;

    @Autowired
    MockMvc mvc;

    @Autowired
    ShelterRepository shelters;

    // ---------- helpers ----------

    private long seedShelter(String name, double lat, double lng) {
        Shelter shelter = new Shelter(name, new GeoPoint(lat, lng), ShelterStatus.ACTIVE,
                null, ShelterSource.USER);
        shelters.save(shelter);
        return shelter.getId();
    }

    private long seedShelterWithCapacity(String name, double lat, double lng, int capacity) {
        Shelter shelter = new Shelter(name, new GeoPoint(lat, lng), ShelterStatus.ACTIVE,
                null, ShelterSource.USER, null, null, null, null, null, null, capacity);
        shelters.save(shelter);
        return shelter.getId();
    }

    private List<Long> idsOf(MvcResult result) throws Exception {
        return JsonPath.parse(result.getResponse().getContentAsString())
                .read("$[*].id", List.class).stream()
                .map(value -> ((Number) value).longValue())
                .toList();
    }

    // ---------- backward compatibility ----------

    @Test
    void omittedParametersAnswerTheFullListInIdOrder() throws Exception {
        long a = seedShelter("Kesk varjend", 58.5, 25.0);
        long b = seedShelter("Põhi varjend", 59.0, 24.0);
        long c = seedShelter("Lõuna varjend", 57.9, 26.0);

        MvcResult full = mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andReturn();

        // every ACTIVE row, stable id-ascending — the pre-change behaviour
        assertThat(idsOf(full)).containsExactly(a, b, c);

        // the same answer with the new params explicitly at their
        // no-op values — the endpoint contract did not move
        MvcResult allSource = mvc.perform(get("/api/shelters").param("source", "ALL"))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult maxPage = mvc.perform(get("/api/shelters").param("limit", "200").param("offset", "0"))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(allSource.getResponse().getContentAsString())
                .isEqualTo(full.getResponse().getContentAsString());
        assertThat(maxPage.getResponse().getContentAsString())
                .isEqualTo(full.getResponse().getContentAsString());

        // a limit still truncates the stably-ordered list
        mvc.perform(get("/api/shelters").param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Kesk varjend"))
                .andExpect(jsonPath("$[1].name").value("Põhi varjend"));
    }

    // ---------- the viewport () ----------

    @Test
    void viewportKeepsInsideRowsAndIncludesTheEdges() throws Exception {
        // inside + exactly ON each edge (the inclusive BETWEEN semantics)
        seedShelter("Kesk", 58.5, 25.0);
        seedShelter("AarelMinLat", MIN_LAT, 25.0);
        seedShelter("AarelMaxLat", MAX_LAT, 25.0);
        seedShelter("AarelMinLng", 58.5, MIN_LNG);
        seedShelter("AarelMaxLng", 58.5, MAX_LNG);
        // outside the box, one leg at a time
        seedShelter("VäljasLoodes", 57.9, 25.0);
        seedShelter("VäljasPõhjas", MAX_LAT + 0.1, 25.0);
        seedShelter("VäljasLäänes", 58.5, MIN_LNG - 0.1);
        seedShelter("VäljasIdas", 58.5, MAX_LNG + 0.1);
        // inside the box but hidden — still wins
        Shelter hidden = new Shelter("Peidetud", new GeoPoint(58.5, 25.0),
                ShelterStatus.INACTIVE, null, ShelterSource.USER);
        shelters.save(hidden);

        // five rows, in the stable id-ascending seed order — edges included,
        // the outside rows and the hidden row excluded
        mvc.perform(get("/api/shelters")
                        .param("minLat", String.valueOf(MIN_LAT))
                        .param("minLng", String.valueOf(MIN_LNG))
                        .param("maxLat", String.valueOf(MAX_LAT))
                        .param("maxLng", String.valueOf(MAX_LNG)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(5)))
                .andExpect(jsonPath("$[0].name").value("Kesk"))
                .andExpect(jsonPath("$[1].name").value("AarelMinLat"))
                .andExpect(jsonPath("$[2].name").value("AarelMaxLat"))
                .andExpect(jsonPath("$[3].name").value("AarelMinLng"))
                .andExpect(jsonPath("$[4].name").value("AarelMaxLng"));

        // the same rows without the viewport answer the outside rows too
        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(9)));
    }

    // ---------- paging ----------

    @Test
    void pagesTileTheListWithoutOverlapOrSkips() throws Exception {
        // seven rows, stable id-ascending (insertion order here)
        for (int i = 1; i <= 7; i++) {
            seedShelter("Leht " + i, 58.0 + i * 0.01, 24.0 + i * 0.01);
        }

        List<Long> full = idsOf(mvc.perform(get("/api/shelters")).andExpect(status().isOk()).andReturn());
        assertThat(full).hasSize(7);

        List<Long> page0 = idsOf(mvc.perform(get("/api/shelters").param("limit", "3").param("offset", "0"))
                .andExpect(status().isOk()).andReturn());
        List<Long> page1 = idsOf(mvc.perform(get("/api/shelters").param("limit", "3").param("offset", "3"))
                .andExpect(status().isOk()).andReturn());
        List<Long> page2 = idsOf(mvc.perform(get("/api/shelters").param("limit", "3").param("offset", "6"))
                .andExpect(status().isOk()).andReturn());

        // three / three / one — exactly the tiling of the full list
        assertThat(page0).hasSize(3);
        assertThat(page1).hasSize(3);
        assertThat(page2).hasSize(1);
        // no overlap, no skips: concatenating the pages IS the full list
        assertThat(page0).containsExactlyElementsOf(full.subList(0, 3));
        assertThat(page1).containsExactlyElementsOf(full.subList(3, 6));
        assertThat(page2).containsExactlyElementsOf(full.subList(6, 7));
        // strictly monotone across pages (the total-order guarantee)
        assertThat(page0.get(2)).isLessThan(page1.get(0));
        assertThat(page1.get(2)).isLessThan(page2.get(0));

        // an offset past the end is an empty page, not an error
        mvc.perform(get("/api/shelters").param("limit", "3").param("offset", "9"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(0)));
    }

    @Test
    void repeatedPageRequestsReturnTheSamePage() throws Exception {
        for (int i = 1; i <= 7; i++) {
            seedShelter("Determinism " + i, 58.0 + i * 0.01, 24.0 + i * 0.01);
        }

        MvcResult first = mvc.perform(get("/api/shelters").param("limit", "3").param("offset", "3"))
                .andExpect(status().isOk()).andReturn();
        MvcResult second = mvc.perform(get("/api/shelters").param("limit", "3").param("offset", "3"))
                .andExpect(status().isOk()).andReturn();

        // deterministic over the stable id order — the same bytes
        assertThat(second.getResponse().getContentAsString())
                .isEqualTo(first.getResponse().getContentAsString());
    }

    // ---------- filter-before-page ----------

    @Test
    void filtersApplyBeforeTheSlice() throws Exception {
        // id order: cap / no-cap / cap / no-cap — paging the UNFILTERED
        // list would answer the no-cap row, the filtered list does not
        seedShelterWithCapacity("Maht1", 58.5, 25.0, 40);
        seedShelter("IlmaMaht1", 58.5, 25.1);
        seedShelterWithCapacity("Maht2", 58.5, 25.2, 60);
        seedShelter("IlmaMaht2", 58.5, 25.3);

        mvc.perform(get("/api/shelters").param("hasCapacity", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(2)));

        // the page of the FILTERED list, not the filtered page
        mvc.perform(get("/api/shelters").param("hasCapacity", "true").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Maht1"));
        mvc.perform(get("/api/shelters").param("hasCapacity", "true").param("limit", "1").param("offset", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Maht2"));
    }

    @Test
    void theViewportCombinesWithTheSourceFilter() throws Exception {
        seedShelter("Kasutaja sees", 58.5, 25.0);
        long outside = seedShelter("Kasutaja väljas", 56.0, 20.0);
        Shelter registry = new Shelter("Päästeameti varjend", new GeoPoint(58.5, 25.5),
                ShelterStatus.ACTIVE, "ext-1", ShelterSource.PAASETEAMET);
        shelters.save(registry);

        // both inside the box, one per source — the source filter narrows further
        mvc.perform(get("/api/shelters").param("source", "USER")
                        .param("minLat", String.valueOf(MIN_LAT)).param("minLng", String.valueOf(MIN_LNG))
                        .param("maxLat", String.valueOf(MAX_LAT)).param("maxLng", String.valueOf(MAX_LNG)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Kasutaja sees"));

        mvc.perform(get("/api/shelters").param("source", "REGISTRY")
                        .param("minLat", String.valueOf(MIN_LAT)).param("minLng", String.valueOf(MIN_LNG))
                        .param("maxLat", String.valueOf(MAX_LAT)).param("maxLng", String.valueOf(MAX_LNG)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Päästeameti varjend"));

        // the viewport excludes the USER row outside the box from the unfiltered list too
        MvcResult boxed = mvc.perform(get("/api/shelters")
                        .param("minLat", String.valueOf(MIN_LAT)).param("minLng", String.valueOf(MIN_LNG))
                        .param("maxLat", String.valueOf(MAX_LAT)).param("maxLng", String.valueOf(MAX_LNG)))
                .andExpect(status().isOk())
                .andReturn();
        List<Long> boxedIds = idsOf(boxed);
        assertThat(boxedIds).hasSize(2);
        assertThat(boxedIds).doesNotContain(outside);
    }

    // ---------- the 400 vocabulary ----------

    @Test
    void aPartialBoxIsRefused() throws Exception {
        // any one edge without the rest — no unambiguous meaning
        mvc.perform(get("/api/shelters").param("minLat", "58.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("minLat, minLng, maxLat and maxLng must be given together"))
                .andExpect(jsonPath("$.path").isNotEmpty());
    }

    @Test
    void anInvertedBoxIsRefused() throws Exception {
        mvc.perform(get("/api/shelters")
                        .param("minLat", "60.0").param("minLng", "23.0")
                        .param("maxLat", "57.0").param("maxLng", "27.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("minLat must be <= maxLat"));
        mvc.perform(get("/api/shelters")
                        .param("minLat", "57.0").param("minLng", "30.0")
                        .param("maxLat", "59.0").param("maxLng", "20.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("minLng must be <= maxLng"));
    }

    @Test
    void anOutOfRangeOrNonFiniteBoxIsRefused() throws Exception {
        mvc.perform(get("/api/shelters")
                        .param("minLat", "91").param("minLng", "23.0")
                        .param("maxLat", "95").param("maxLng", "27.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Latitude must be between -90 and 90"));
        mvc.perform(get("/api/shelters")
                        .param("minLat", "57.0").param("minLng", "181.0")
                        .param("maxLat", "59.0").param("maxLng", "190.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Longitude must be between -180 and 180"));
        // "NaN" binds to Double.NaN — every comparison against it is false,
        // so the explicit finiteness check is what catches it
        mvc.perform(get("/api/shelters")
                        .param("minLat", "NaN").param("minLng", "23.0")
                        .param("maxLat", "59.0").param("maxLng", "27.0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Bounding box coordinates must be finite numbers"));
    }

    @Test
    void outOfBoundsPagingValuesAreRefused() throws Exception {
        mvc.perform(get("/api/shelters").param("limit", "0"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 200"))
                .andExpect(jsonPath("$.path").isNotEmpty());
        mvc.perform(get("/api/shelters").param("limit", "201"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 200"));
        mvc.perform(get("/api/shelters").param("offset", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("offset must be non-negative"));
        // non-numeric values stay on Spring binding's 400 (same as the enums)
        mvc.perform(get("/api/shelters").param("limit", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        mvc.perform(get("/api/shelters").param("minLat", "not-a-number"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }
}
