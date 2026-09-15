package ee.sheltermap.api;

import ee.sheltermap.domain.UserData;
import io.swagger.v3.oas.annotations.media.Schema;

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
@Schema(description = "The admin user-suspension list row — the account "
        + "identity the Users tab needs plus its suspension state. kind is "
        + "the machine value (GUEST | REGISTERED | ADMIN); guests never "
        + "appear in the list (they have no credentials to suspend), and an "
        + "ADMIN row is listed so the provisioned account is visible but not "
        + "suspendable (409).")
public record AdminUserDto(
        Long id,
        String name,
        @Schema(description = "admin-only: the account's e-mail, served from "
                + "/admin/* only (the reporter-identity convention).")
        String email,
        @Schema(description = "The account kind (machine value): REGISTERED "
                + "| ADMIN. Guests never appear in the list; an ADMIN row is "
                + "not suspendable (409).")
        String kind,
        @Schema(description = "The suspension stamp; null while the account "
                + "is active.")
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
