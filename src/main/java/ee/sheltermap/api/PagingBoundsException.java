package ee.sheltermap.api;

/**
 * The ONE 400 for a paging bound violation — a {@code limit} outside
 * 1..200 or a negative {@code offset} on any paged read (backend review
 * 02 F1: the four paged reads used two exception vocabularies for one
 * rule, a shelter exception on the shelter list and a guidance one on
 * the guidance lists; {@link Pagination} speaks this single exception
 * instead). Mapped to the uniform 400 by {@code ApiErrorHandler}; the
 * message is always one of {@link Pagination}'s two constants.
 */
public class PagingBoundsException extends RuntimeException {

    public PagingBoundsException(String message) {
        super(message);
    }
}
