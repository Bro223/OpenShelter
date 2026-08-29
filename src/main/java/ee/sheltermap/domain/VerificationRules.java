package ee.sheltermap.domain;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Policy rules as data (config, not code) — "who can do what" can change
 * without rebuilding.
 *
 * <p>Defaults: {@code VIEW_MAP} is baseline (no claims needed — guests can
 * watch); {@code SUBMIT_SHELTER} is granted by any single level;
 * {@code PUBLISH_INSTANTLY} only by {@link VerificationLevel#SMART_ID}.
 */
public record VerificationRules(
        Set<Capability> baseline,
        Map<VerificationLevel, Set<Capability>> byLevel) {

    public VerificationRules {
        baseline = baseline == null ? Set.of() : Set.copyOf(baseline);
        Map<VerificationLevel, Set<Capability>> copy = new EnumMap<>(VerificationLevel.class);
        if (byLevel != null) {
            byLevel.forEach((level, caps) -> copy.put(level, caps == null ? Set.of() : Set.copyOf(caps)));
        }
        byLevel = Collections.unmodifiableMap(copy);
    }

    /** Default rule set for the whole system. */
    public static VerificationRules ofDefaults() {
        Map<VerificationLevel, Set<Capability>> byLevel = new EnumMap<>(VerificationLevel.class);
        byLevel.put(VerificationLevel.EMAIL, EnumSet.of(Capability.SUBMIT_SHELTER));
        byLevel.put(VerificationLevel.PHONE, EnumSet.of(Capability.SUBMIT_SHELTER));
        byLevel.put(VerificationLevel.SMART_ID,
                EnumSet.of(Capability.SUBMIT_SHELTER, Capability.PUBLISH_INSTANTLY));
        return new VerificationRules(EnumSet.of(Capability.VIEW_MAP), byLevel);
    }
}
