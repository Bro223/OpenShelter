package ee.sheltermap.auth;

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
 */
public record MeResponse(
        String name,
        String email,
        String phone,
        String nationalIdCode,
        List<VerificationLevel> levels) {

    /** Builds the DTO from the domain snapshot of the authenticated user. */
    public static MeResponse from(RegisteredUser user) {
        UserData data = user.getData();
        List<VerificationLevel> levels = Stream.of(VerificationLevel.values())
                .filter(data.levels()::contains)
                .toList();
        return new MeResponse(data.name(), data.email(), data.phone(), data.nationalIdCode(), levels);
    }
}
