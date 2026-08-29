package ee.sheltermap.domain;

import java.util.Set;

/**
 * Immutable snapshot of a user's data — callers never get live entity internals.
 */
public record UserData(
        String name,
        String email,
        String phone,
        String nationalIdCode,
        Set<VerificationLevel> levels) {

    public UserData {
        levels = levels == null ? Set.of() : Set.copyOf(levels);
    }
}
