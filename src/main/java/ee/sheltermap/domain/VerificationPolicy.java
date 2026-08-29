package ee.sheltermap.domain;

import java.util.EnumSet;
import java.util.Objects;
import java.util.Set;

/**
 * Answers "is this capability granted for these levels?".
 *
 * <p>Answer = {@code baseline ∪ (union of byLevel[level] for each active level)}.
 * Rules are data ({@link VerificationRules}); this class only applies them.
 */
public class VerificationPolicy {

    private final VerificationRules rules;

    public VerificationPolicy(VerificationRules rules) {
        this.rules = Objects.requireNonNull(rules, "rules");
    }

    /** Policy with the system-wide default rules. */
    public static VerificationPolicy defaults() {
        return new VerificationPolicy(VerificationRules.ofDefaults());
    }

    public boolean allows(Set<VerificationLevel> levels, Capability capability) {
        Objects.requireNonNull(capability, "capability");
        Set<Capability> effective = EnumSet.noneOf(Capability.class);
        effective.addAll(rules.baseline());
        if (levels != null) {
            for (VerificationLevel level : levels) {
                Set<Capability> granted = rules.byLevel().get(level);
                if (granted != null) {
                    effective.addAll(granted);
                }
            }
        }
        return effective.contains(capability);
    }
}
