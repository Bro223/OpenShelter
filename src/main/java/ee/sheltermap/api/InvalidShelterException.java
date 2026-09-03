package ee.sheltermap.api;

/** Rejected user-shelter submission (e.g. coordinates outside Estonia). Maps to 400. */
public class InvalidShelterException extends RuntimeException {
    public InvalidShelterException(String message) {
        super(message);
    }
}
