package ee.sheltermap.app;

/**
 * A second information request for a shelter that already has one
 * — mapped to 409. One exchange per shelter: the replied row is
 * kept (audit posture), so a re-request would collide with it.
 */
public class DuplicateInfoRequestException extends RuntimeException {
    public DuplicateInfoRequestException() {
        super("This shelter already has an information request");
    }
}
