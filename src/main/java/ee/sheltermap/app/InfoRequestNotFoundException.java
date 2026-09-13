package ee.sheltermap.app;

/**
 * A reply to a shelter that has no information request (M10 slice 3) —
 * mapped to 404, the same vocabulary as the other unknown-id answers.
 */
public class InfoRequestNotFoundException extends RuntimeException {
    public InfoRequestNotFoundException() {
        super("No information request for this shelter");
    }
}
