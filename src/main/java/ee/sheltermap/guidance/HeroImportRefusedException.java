package ee.sheltermap.guidance;

/**
 * The hero import was REFUSED by the address/scheme policy (guard 1–3 of
 * guidance-hero-import), or the remote host answered a deterministic 4xx:
 * the URL is unacceptable AS GIVEN — retrying it will never succeed, only
 * a different URL will. Mapped to 400 by
 * {@link ee.sheltermap.api.ApiErrorHandler}, the same vehicle as the
 * other admin-input 400s.
 *
 * <p>Every refused import fails the publish that carries it, so the post
 * stays a DRAFT with the URL intact — the admin sees this message, fixes
 * the URL, and retries.
 *
 * <p>The message is deliberately readable (it names the scheme, the
 * address and the reason) because the endpoint is ADMIN-ONLY and the URL
 * is the admin's own input — unlike the public geo resolver, which must
 * not enumerate reasons to anonymous callers.
 */
public class HeroImportRefusedException extends RuntimeException {

    public HeroImportRefusedException(String message) {
        super(message);
    }
}
