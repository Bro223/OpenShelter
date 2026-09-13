package ee.sheltermap.auth;

import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.UserData;
import ee.sheltermap.domain.VerificationLevel;

import java.util.List;
import java.util.stream.Stream;

/**
 * The authenticated user's real profile + REAL verification claims — the
 * response of {@code GET /account/me} and {@code PUT /account/profile}.
 *
 * <p>{@code levels} holds exactly the levels that are actually verified for
 * this account (non-revoked claims), in enum order for a stable body — the
 * frontend adopts it as the single source of truth for its verification
 * labels (replacing the old session-only optimistic mirror).
 *
 * <p>{@code isAdmin} is always present (admin-moderation D2): the frontend
 * gates the admin route and nav item on it. It reflects the freshly loaded
 * user's KIND (kind is the truth) — {@code true} only for the ADMIN-kind
 * account, never derived from any token claim.
 */
public record MeResponse(
        String name,
        String email,
        String phone,
        List<VerificationLevel> levels,
        boolean isAdmin) {

    /** Builds the DTO from the domain snapshot of the authenticated user. */
    public static MeResponse from(RegisteredUser user) {
        UserData data = user.getData();
        List<VerificationLevel> levels = Stream.of(VerificationLevel.values())
                .filter(data.levels()::contains)
                .toList();
        return new MeResponse(data.name(), data.email(), data.phone(),
                levels, user instanceof AdminUser);
    }
}
