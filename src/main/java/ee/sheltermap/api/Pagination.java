package ee.sheltermap.api;

import java.util.List;
import java.util.Objects;

/**
 * The one paging vocabulary of the whole API (list-page-paging; backend
 * review 02 F1/F2): ONE 400 exception ({@link PagingBoundsException}),
 * ONE limit message, ONE {@link #MAX_PAGE_SIZE} and the ONE
 * offset/limit {@link #slice}.
 *
 * <p>Before this helper the bound check was copy-pasted into the four
 * paged reads (three of the four byte-identical, the fourth reading the
 * bound from the constant the others ignored) and the limit message was
 * hardcoded at six sites — a single edit could move the cap on one
 * endpoint and silently leave the other five. The two slice
 * implementations ({@code GuidanceService} and {@code ShelterQueryService})
 * were identical and are gone.
 *
 * <p>The rule this class owns: {@code limit} is optional — absent means
 * "no paging" (the whole list, the pre-paging behaviour); present, it is
 * 1..{@value #MAX_PAGE_SIZE} or a 400. {@code offset} is optional —
 * absent means the first page; negative is a 400. An offset past the end
 * is an empty page, never an error. Consecutive pages tile the caller's
 * stable order without overlap or skips.
 *
 * <p>Call the bounds BEFORE the read: a rejected page must not pay for
 * the list load it would have sliced.
 */
public final class Pagination {

    /** The page-size cap shared by every paged read of the API. */
    public static final int MAX_PAGE_SIZE = 200;

    /** The one limit message (the paging ITs pin it verbatim). */
    public static final String LIMIT_MESSAGE = "limit must be between 1 and " + MAX_PAGE_SIZE;

    /** The one offset message (the paging ITs pin it verbatim). */
    public static final String OFFSET_MESSAGE = "offset must be non-negative";

    private Pagination() {
    }

    /**
     * The page-size bound: absent ({@code null}) = no paging, passed
     * through; present outside 1..{@value #MAX_PAGE_SIZE} = 400.
     *
     * @throws PagingBoundsException the uniform paging 400
     */
    public static Integer requireLimit(Integer limit) {
        if (limit == null) {
            return null;
        }
        if (limit < 1 || limit > MAX_PAGE_SIZE) {
            throw new PagingBoundsException(LIMIT_MESSAGE);
        }
        return limit;
    }

    /**
     * The offset bound: absent ({@code null}) = the first page, passed
     * through; negative = 400.
     *
     * @throws PagingBoundsException the uniform paging 400
     */
    public static Integer requireOffset(Integer offset) {
        if (offset == null) {
            return null;
        }
        if (offset < 0) {
            throw new PagingBoundsException(OFFSET_MESSAGE);
        }
        return offset;
    }

    /**
     * The defaulted-limit bound (the admin trail reads — the audit trail,
     * the report queue, the alerts: absent = the endpoint's default,
     * present outside 1..{@value #MAX_PAGE_SIZE} = 400).
     *
     * @throws PagingBoundsException the uniform paging 400
     */
    public static int requireDefaultedLimit(Integer limit, int defaultLimit) {
        int size = limit == null ? defaultLimit : limit;
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new PagingBoundsException(LIMIT_MESSAGE);
        }
        return size;
    }

    /**
     * The offset/limit slice over a STABLE order — nulls mean "no
     * paging" (the offset defaults to 0); an offset past the end answers
     * an empty page, never an error. The bounds themselves
     * (1..{@value #MAX_PAGE_SIZE}, non-negative offset) are the caller's
     * ({@link #requireLimit}/{@link #requireOffset}), so this never sees
     * a bad value. Runs over whatever deterministic order the caller
     * hands it (the public index's pinned-first order, the shelter
     * list's id-ascending order, the admin list's stored manual order),
     * so consecutive pages tile the list without overlap or skips.
     */
    public static <T> List<T> slice(List<T> rows, Integer offset, Integer limit) {
        Objects.requireNonNull(rows, "rows");
        int from = offset == null ? 0 : offset;
        if (from >= rows.size()) {
            return List.of();
        }
        int to = limit == null ? rows.size() : Math.min(rows.size(), from + limit);
        return List.copyOf(rows.subList(from, to));
    }

    /**
     * A paged read with its un-paged total: the rows of ONE page
     * plus the length of the read WITHOUT the paging (the {@code
     * X-Total-Count} header value, always present on the admin list
     * endpoints). The total is the FILTERED length — filters and search
     * apply, the offset/limit do not.
     *
     * @param <T>    the row type
     * @param rows   the page's rows (possibly empty past the end)
     * @param total  the filtered, un-paged length
     */
    public record Paged<T>(List<T> rows, long total) {

        public Paged {
            Objects.requireNonNull(rows, "rows");
            if (total < 0) {
                throw new IllegalArgumentException("total must be non-negative");
            }
        }
    }
}
