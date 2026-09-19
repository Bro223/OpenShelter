package ee.sheltermap.app;

/**
 * Mapped to 403 by {@link ee.sheltermap.api.ApiErrorHandler} — the
 * environment-provisioned administrator account (kind {@code ADMIN}, created
 * by the startup seeder from {@code ADMIN_EMAIL}/{@code ADMIN_PASSWORD}) is
 * protected from the account-mutating operations this exception is thrown
 * for: self-erasure ({@code DELETE /account}), suspension / unsuspension
 * ({@code POST /admin/users/{id}/suspend|unsuspend}), password reset
 * ({@code POST /auth/password-reset/*}) and contact-detail change
 * ({@code POST /account/*-change/*}).
 *
 * <p>The account is the deployment's access path: its identity and
 * credentials are managed by the environment, not the app, and
 * de-provisioning is an operator action (remove the env vars) — never an
 * in-app one. A self-deletion or a suspension would be a lockout vector; a
 * contact or password change would fork the env-managed identity (the
 * seeder keys on the e-mail). The plain-spoken message names the reason —
 * the 403 vocabulary, like {@link AdminAccessException} and {@link
 * NotVerifiedException}.
 */
public class ProvisionedAdminProtectedException extends RuntimeException {

    public ProvisionedAdminProtectedException(String message) {
        super(message);
    }
}
