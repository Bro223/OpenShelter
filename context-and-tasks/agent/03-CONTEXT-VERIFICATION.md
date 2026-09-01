# Context — Verification

**Source diagram:** `docs/uml/01-user-verification.puml` (packages `verification` + `app`)
**Used by steps:** 2 (create). Referenced by: auth (login relies on claims), api (review requires
verified user).

## Purpose

Prove that a user owns a contact (email / phone / Smart-ID). One-time events that produce
`VerificationClaim`s on the user. **This is NOT authentication** — authentication (password +
tokens) lives in the auth context (`03-auth.puml`).

## Classes to create

### `ee.sheltermap.verification`

| Type | Kind | Key members / notes |
|---|---|---|
| `VerificationProvider` | interface | `providerCode(): String`, `level(): VerificationLevel`, `request(user: RegisteredUser): PendingVerification`, `confirm(user: RegisteredUser, pending: PendingVerification, code: String): boolean`. |
| `EmailVerificationProvider` | class | holds `sender: SmtpSender`. `request` → generate token → send via SMTP. `confirm` → validate token. |
| `PhoneVerificationProvider` | class | holds `sender: SmsSender`. `request` → generate 6-digit OTP (`SecureRandom`) → send via SMS. `confirm` → validate OTP (hash + attempts + expiry). |
| `SmartIdVerificationProvider` | class | **Stub.** Same interface; body is a placeholder note — future flow = start session + poll, provider proves identity via PKI (no stored code). Only this class changes when Smart-ID goes live. |
| `SmsSender` | interface | `send(phone: String, message: String): void`. |
| `TwilioSmsSender` | class | Real SMS via Twilio SDK — **stub in v1** (logs metadata). `@ConditionalOnProperty(app.sms.provider=twilio)` — never active unless explicitly selected. |
| `DevSmsSender` | class | Logs the code to console — free dev + CI. `@ConditionalOnProperty(app.sms.provider=dev, matchIfMissing=true)`. Exactly one `SmsSender` bean at runtime. |
| `SmtpSender` | interface | `send(email: String, message: String): void`. |
| `DevSmtpSender` | class | Logs the token to console — free dev + CI. `@ConditionalOnProperty(app.mail.provider=dev, matchIfMissing=true)`. |
| `SmtpPulseSmtpSender` | class | **Real SMTP** via `JavaMailSender` (spring-boot-starter-mail, smtp-pulse.com), `@ConditionalOnProperty(app.mail.provider=smtp-pulse)`. Credentials from env vars only; From-address from `app.mail.from` (must be verified in the smtp-pulse dashboard). Logs metadata only, never the body; **delivery failures are logged, never thrown** (reset/verify must "always succeed"). Exactly one `SmtpSender` bean at runtime. |
| `VerificationService` | class | holds `providers: Map<VerificationLevel, VerificationProvider>`; `requestVerification(user, level): void`, `confirmVerification(user, level, code): boolean`. **Owns all persistence**: saves `PendingVerification` on request; on successful confirm saves a `VerificationClaim` and attaches it to the user. Failed attempts are persisted (the JPA repo re-maps a fresh object per request, so without the save the attempts limit would never hold across HTTP calls). **No `revoke` method** — revocation is pure domain state (`RegisteredUser.revoke`), dead-code removed. Wired as a Spring bean by `VerificationConfig` (provider beans → level map); HTTP shell is `auth.VerificationController` (`POST /verify/request` + `/verify/confirm`, JWT required). |
| `PendingVerification` | class | `id, level, contact, codeHash, attempts, expiresAt`. Code stored **hashed, never plaintext**. |
| `PendingVerificationRepository` | interface | `save(pending)`, `findActiveByUserAndLevel(userId, level)`, `delete(pending)`. |

### `ee.sheltermap.app` (services + repository seams)

| Type | Kind | Key members / notes |
|---|---|---|
| `UserService` | class | `register(name, email, phone, nationalIdCode): RegisteredUser`, `getData(user): UserData`, `deleteAccount(user): void`. |
| `UserRepository` | interface | `save(user): void`, `findById(id): User`. |
| `ShelterService` | class | `addPlace(user: User, place: Shelter): void` — **checks `user.canWrite()` first**, then saves (status `ACTIVE`, source `USER`). |
| `ShelterRepository` | interface | `save(shelter): void`, `findByExternalId(String): Optional<Shelter>`, `saveAll(List<Shelter>): void`, `deleteBySourceAndExternalIdNotIn(ShelterSource, List<String>): int`, `findAll(): List<Shelter>`, `findAllBySourceIn(List<ShelterSource>): List<Shelter>`. |
| `ShelterReviewRepository` | interface | (listed in `02-CONTEXT-DOMAIN.md`). |

## Design decisions

1. **One class per verification method, behind one interface.** Each method needs different
   collaborators injected (SMTP client vs Twilio SDK vs Smart-ID SDK) — you can't inject a client
   into a method, only into a class. The interface makes channels swappable and testable.
2. **Providers are pure channel adapters — they never touch the database.** They generate/send/
   validate codes. `VerificationService` persists `PendingVerification` and `VerificationClaim`.
3. **Code discipline:** codes are hashed at rest (`codeHash`), have an `attempts` limit (brute-force
   guard) and `expiresAt` (short-lived). Never log codes.
4. **`canWrite()` is serviced, not a subclass method** (TIJ Ch 1 fix for the is-like-a trap):
   `ShelterService.addPlace` asks `user.canWrite()`; `RegisteredUser` delegates to
   `VerificationPolicy`. Writing is not hidden on one subclass.
5. **Registration creates a user with `levels = {}`** — verification happens *after* creation via
   `requestVerification` → `confirmVerification` (see `02-verification-flow.puml`).

## Contracts with other contexts

- `auth.AuthService.register` needs the password captured at registration — profile creation goes
  through `UserService` here, password storage through the auth context (`UserCredentials`). They
  are **separate aggregates** (see `03-auth.puml` note).
- `api.ShelterReviewService` checks `user.levels()` non-empty before allowing a review.
- Sequence flow in `02-verification-flow.puml` is the executable spec for register → verify →
  canWrite → addPlace. Follow it.

## Testing notes

- Provider tests with **fake senders**: assert OTP/token generated, sent, hashed, expiring;
  wrong code → `false`; attempts exhausted → `false`; expired → `false`.
- `VerificationService` tests with fake providers: dispatch by level, claim persisted on confirm,
  claim revoked on `revoke`, `levels()` reflects the change.
- `ShelterService.addPlace`: guest → rejected (canWrite false); unverified registered → rejected;
  verified → saved as ACTIVE/USER.
