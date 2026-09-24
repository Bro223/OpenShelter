package ee.sheltermap.config;

import org.slf4j.Logger;

/**
 * The fail-closed startup-guard template — the four guards
 * ({@link ApiDocsGuard}, {@link DevEndpointsGuard}, {@link DevSenderGuard},
 * {@link ProdJwtGuard}) each spelled the same "loud log + loud rejection"
 * idiom and the same two-flag name composition; this is the one place that
 * idiom now lives.
 *
 * <p>The rule is the guard's own (each keeps its {@code Profiles} check and
 * its own reason/remedy wording); what is shared is the SHAPE of the
 * failure: a {@code log.error} of the full refusing line, then an
 * {@link IllegalStateException} carrying the same fact as the rejection —
 * so a log-only reader and an exception-only reader (the boot-failure
 * output) can never disagree about why the boot was refused.
 *
 * <p>Package-private on purpose: it is a formatting template for the
 * guards next door, not a bean and not an API — the guards' constructors
 * (and their tests' constructor pins) are unchanged, each pre-composes its
 * own strings and calls in.
 */
final class FailClosedGuard {

    private FailClosedGuard() {
    }

    /**
     * The two-enabled-names composition every flag-guard shares: both
     * enabled → {@code "first + second"}; one → that one's name. The
     * {@code first} name wins the single-enabled case in every guard, so
     * the argument order is the guards' own (docs, e-mail-test, mail).
     */
    static String enabledFlagNames(boolean first, boolean second,
                                   String firstName, String secondName) {
        if (first && second) {
            return firstName + " + " + secondName;
        }
        return first ? firstName : secondName;
    }

    /**
     * The refusal itself: the full line to the log, then the boot-failing
     * rejection. The caller pre-composes BOTH strings (its own reason,
     * the resolved active-profile set, its remedy wording) — the template
     * owns the pairing and the exception type, nothing else.
     */
    static void refuseToBoot(Logger log, String refusingLine, String rejection) {
        log.error(refusingLine);
        throw new IllegalStateException(rejection);
    }
}
