package ee.sheltermap.api;

import ee.sheltermap.domain.UserData;

import java.time.Instant;

/**
 * The admin user-suspension list row (M10 slice 1) — the account
 * identity the Users tab needs plus its suspension state. {@code kind}
 * is the machine value (GUEST | REGISTERED | ADMIN); guests never
 * appear in the list (they have no credentials to suspend), and an
 * ADMIN row is listed so the provisioned account is visible but not
 * suspendable (409). E-mail is admin-only data, served from
 * {@code /admin/*} only (the reporter-identity convention).
 */
public record AdminUserDto(
        Long id,
        String name,
        String email,
        String kind,
        Instant suspendedAt) {

    /** Convenience for the projection: null-safe name/email of a kind. */
    public static AdminUserDto of(UserData data, String kind, Instant suspendedAt, Long id) {
        return new AdminUserDto(id,
                data.name(),
                data.email(),
                kind,
                suspendedAt);
    }
}
