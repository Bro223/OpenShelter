package ee.sheltermap.app;

/**
 * A second reply to an already-answered information request
 * — mapped to 409. The request is answered ONCE; the row is kept after the
 * reply (audit posture), so a re-answer is a conflict, not an update.
 */
public class InfoRequestAlreadyAnsweredException extends RuntimeException {
    public InfoRequestAlreadyAnsweredException() {
        super("This shelter's information request has already been answered");
    }
}
