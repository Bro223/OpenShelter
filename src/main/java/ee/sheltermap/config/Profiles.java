package ee.sheltermap.config;

import org.springframework.core.env.Environment;

import java.util.Objects;

/**
 * The one dev/test profile rule shared by the fail-closed startup guards.
 *
 * <p>The guards read the RESOLVED active set, not the raw
 * {@code spring.profiles.active} PROPERTY string, which is blind to profile
 * GROUPS and {@code spring.profiles.default} — both materialize in the
 * ENVIRONMENT's resolved active set, not in the property. That is what
 * {@link Environment#getActiveProfiles()} returns: the resolved set the
 * application actually runs with.
 *
 * <p>The rule itself is unchanged: the active set is dev/test-only when it
 * is NON-EMPTY and EVERY entry is exactly {@code dev} or {@code test}
 * (case-sensitive). A blank set is NOT a dev deploy (fail closed), and a
 * mixed set like {@code production,dev} is not exempt — one stray entry
 * arms the guard.
 */
public final class Profiles {

    private Profiles() {
    }

    /**
     * @param env the environment whose resolved active profile set is
     *            checked
     * @return {@code true} only when the ENTIRE active set is a subset of
     *         exactly {@code dev} and {@code test} (case-sensitive) and
     *         non-empty
     */
    public static boolean isDevTestOnly(Environment env) {
        Objects.requireNonNull(env, "env");
        String[] active = env.getActiveProfiles();
        if (active.length == 0) {
            return false; // blank profile set is NOT a dev deploy — fail closed
        }
        for (String profile : active) {
            if (!"dev".equals(profile) && !"test".equals(profile)) {
                return false;
            }
        }
        return true;
    }
}
