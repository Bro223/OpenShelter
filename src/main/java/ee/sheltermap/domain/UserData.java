package ee.sheltermap.domain;

import java.util.Set;

/**
 * Immutable snapshot of a user's data — callers never get live entity internals.
 *
 * <p>{@code levels} is the CURRENT standing (the active, non-revoked
 * claims — what write-capability and the "verified at all" reads use);
 * {@code everLevels} is the MONOTONIC one — every channel ever
 * confirmed, revoked included (the pin's "is or was" depth reads it).
 */
public record UserData(
        String name,
        String email,
        String phone,
        Set<VerificationLevel> levels,
        Set<VerificationLevel> everLevels) {

    public UserData {
        levels = levels == null ? Set.of() : Set.copyOf(levels);
        everLevels = everLevels == null ? Set.of() : Set.copyOf(everLevels);
    }
}
