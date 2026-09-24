package ee.sheltermap.guidance;

/**
 * The hero import was REFUSED by the address/scheme policy (guards
 * 1–3), or the remote host answered a deterministic 4xx:
 * the URL is unacceptable AS GIVEN — retrying it will never succeed, only
 * a different URL will.
 *
 * <p>Like every import failure it never blocks the save:
 * {@code GuidanceService.resolveHeroOnSave} catches it, stores the post
 * with this message as its {@code heroImportError} and keeps the URL —
 * the admin sees the message against the hero field, fixes the URL, and
 * the next save retries the import (the hero falls back to the library
 * reference, or nothing).
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
