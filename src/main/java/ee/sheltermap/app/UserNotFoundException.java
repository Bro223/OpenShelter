package ee.sheltermap.app;

/**
 * Mapped to 404 by {@link ee.sheltermap.api.ApiErrorHandler} (M10 slice 1)
 * — the admin user-suspension endpoints reject unknown account ids the
 * same way every other admin write rejects unknown shelter/report ids.
 */
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(long id) {
        super("User not found: " + id);
    }
}
