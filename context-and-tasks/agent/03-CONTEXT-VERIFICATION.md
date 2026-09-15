# Context — Verification

**Source diagram:** `../01-user-verification.puml` (packages `verification` + `app`)
**Used by steps:** 2 (create). Referenced by: auth (login relies on claims), api (reports and
submissions require a verified user).

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
| `PhoneVerificationProvider` | class | holds `sender: SmsSender`. `request` → generate 6-digit OTP (`SecureRandom`) → send via SMS. `confirm` → validate OTP (hash + attempts + expiry). `providerCode()` = `"sms"` (channel-agnostic — Twilio is swappable). E.164-normalizes the phone at the channel boundary (`PhoneNumbers`). |
| `PhoneNumbers` | class | lenient E.164 normalization (strips separators, `00`→`+`, Estonian local → `+372…`). Never throws. |
| `SmartIdVerificationProvider` | class | **Stub.** Same interface; body is a placeholder note — future flow = start session + poll, provider proves identity via PKI (no stored code). Only this class changes when Smart-ID goes live. |
| `SmsSender` | interface | `send(phone: String, message: String): void`. |
| `TwilioSmsSender` | class | **Real** SMS via Twilio Programmable Messaging — send-only. `@ConditionalOnProperty(app.sms.provider=twilio)`. Credentials from env vars (`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` + `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM`). Logs metadata only, never the OTP; delivery errors logged, never thrown (anti-enumeration). Internal `TwilioApi` seam → hand-written fakes in tests (no Mockito). |
| `DevSmsSender` | class | Logs the code to console — free dev + CI. `@ConditionalOnProperty(app.sms.provider=dev, matchIfMissing=true)`. Exactly one `SmsSender` bean at runtime. |
| `VerificationSendLog` | interface | `countToday(userId, level)`, `lastSentAt(userId, level)`, `record(userId, level, contact, sentAt)` — durable store behind the anti-spam throttle. Must never throw on `record`. |
| `FileVerificationSendLog` | class | file-backed send log (`app.verification.send-log-path`, default `data/verification-send.log`) — **survives restarts** (product decision). One tab-separated line per send; prunes entries older than 2 days; corrupted lines skipped. |
| `VerificationThrottledException` | class | → 429 uniform `ErrorResponse` (in `verification` package, not `auth` — dependency rule). |
| `SmtpSender` | interface | `send(email: String, message: String): void`. |
| `DevSmtpSender` | class | Logs the token to console — free dev + CI. `@ConditionalOnProperty(app.mail.provider=dev, matchIfMissing=true)`. |
| `SmtpPulseSmtpSender` | class | **Real SMTP** via `JavaMailSender` (spring-boot-starter-mail, smtp-pulse.com), `@ConditionalOnProperty(app.mail.provider=smtp-pulse)`. Credentials from env vars only; From-address from `app.mail.from` (must be verified in the smtp-pulse dashboard). Logs metadata only, never the body; **delivery failures are logged, never thrown** (reset/verify must "always succeed"). Exactly one `SmtpSender` bean at runtime. |
| `VerificationService` | class | holds `providers: Map<VerificationLevel, VerificationProvider>`, `sendLog: VerificationSendLog`, `properties: VerificationProperties`, `clock: Clock`; `requestVerification(user, level): void`, `confirmVerification(user, level, code): boolean`. **Owns all persistence**: saves `PendingVerification` on request; on successful confirm saves a `VerificationClaim` and attaches it to the user. Failed attempts are persisted (the JPA repo re-maps a fresh object per request, so without the save the attempts limit would never hold across HTTP calls). **Anti-spam**: before sending, checks resend cooldown (`lastSentAt` + `cooldown-seconds`) and the per-user daily cap (`countToday` vs `max-per-day`) via the durable send log → `VerificationThrottledException` (429); records each send afterwards. **No `revoke` method** — revocation is pure domain state (`RegisteredUser.revoke`), dead-code removed. Wired as a Spring bean by `VerificationConfig` (provider beans → level map + `FileVerificationSendLog`); HTTP shell is `auth.VerificationController` (`POST /verify/request` + `/verify/confirm`, JWT required, per-IP token bucket on request). |
| `PendingVerification` | class | `id, level, contact, codeHash, attempts, expiresAt`. Code stored **hashed, never plaintext**. |
| `PendingVerificationRepository` | interface | `save(pending)`, `findActiveByUserAndLevel(userId, level)`, `delete(pending)`. |

### `ee.sheltermap.app` (services + repository seams)

| Type | Kind | Key members / notes |
|---|---|---|
| `UserService` | class | `register(name, email, phone): RegisteredUser`, `findByEmailOrPhone(contact): RegisteredUser`, `findByEmail(email): RegisteredUser`, `findByPhone(phone): RegisteredUser`. (The service-level `getData(user)` read is gone — profile data comes from the domain `User.getData()`; `guest()` was removed in the review-fix pass. Account deletion IS part of the product contract: `DELETE /account` (legal-recovery M4) delegates to `auth.AccountService.deleteAccount(registered)`, which purges the declared private homes, redacts the audit reasons, orphans the public rows and ends in the domain `User.deleteAccount()` cascade.) |
| `UserRepository` | interface | `save(user): void`, `findById(id): User`, `findByEmail(email): RegisteredUser`, `findByPhone(phone): RegisteredUser`, `findByIds(ids: Collection<Long>): Map<Long, User>` (batched lookup — no N+1 on listings). |
| `ShelterService` | class | `addPlace(user: User, place: Shelter): void` — **checks `user.canWrite()` first**, then saves (status `ACTIVE`, source `USER`). |
| `ShelterRepository` | interface | `save(shelter): void`, `findByExternalId(String): Optional<Shelter>`, `findById(Long): Optional<Shelter>`, `deleteBySourceAndExternalIdNotIn(ShelterSource, List<String>): int`, `findAll(): List<Shelter>`, `findAllActiveBySourceIn(List<ShelterSource>): List<Shelter>` (the ACTIVE-only public projection), `countByCreatedByAndSourceAndStatus`, `countByCreatedByAndSourceAndCreatedAtAfter`, `countByCreatedByAndSourceAndReviewStatus`, `findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc`, `findByCreatedBy(Long): List<Shelter>`, `findByIds(Collection<Long>): List<Shelter>`, `deleteById(Long): void`. (`saveAll` / `findAllBySourceIn` no longer exist.) |

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
6. **Twilio is send-only; the OTP logic is ours.** `TwilioSmsSender` only delivers text via
   Programmable Messaging. Code generation, retry/cooldown and verification live in
   `PhoneVerificationProvider` + `VerificationService`, so swapping the SMS provider is a new
   `SmsSender` class + a config line — no Twilio Verify, no vendor lock-in.
7. **Anti-spam throttle, three independent dimensions** (reliable abuse prevention): per-IP token
   bucket on `/verify/request` (controller, `ClientIps` X-Forwarded-For-aware) · resend cooldown
   per (user, level) · per-user daily cap per (user, level) backed by the **file-based**
   `VerificationSendLog` (survives restarts — product decision). Violations → 429, uniform
   `ErrorResponse`, and the checks never reveal whether a contact exists (anti-enumeration).
   Email and SMS go through the same throttle; codes stay hashed, expiring, attempt-limited.
8. **E.164 at the channel boundary** — `PhoneNumbers` normalizes leniently in the sender path;
   the domain stores what the user registered.

## Contracts with other contexts

- `auth.AuthService.register` needs the password captured at registration — profile creation goes
  through `UserService` here, password storage through the auth context (`UserCredentials`). They
  are **separate aggregates** (see `03-auth.puml` note).
- `api.ShelterQueryService` builds every read projection (list / detail / admin) and the controllers delegate to it — no service checks `user.levels()` for writes; the gate is `user.canWrite()` (`ShelterService.addPlace`) plus the verified-registered checks in `ShelterController`/`ShelterReportService`. (The removed review surface `api.ShelterReviewService` has no counterpart — V21 dropped the review model.)
- Sequence flow in `02-verification-flow.puml` is the executable spec for register → verify →
  canWrite → addPlace. Follow it.

## Testing notes

- Provider tests with **fake senders**: assert OTP/token generated, sent, hashed, expiring;
  wrong code → `false`; attempts exhausted → `false`; expired → `false`.
- `VerificationService` tests with fake providers + `InMemoryVerificationSendLog` + `MutableClock`:
  dispatch by level, claim persisted on confirm, `levels()` reflects the change; **anti-spam** —
  resend within cooldown → `VerificationThrottledException`, resend after cooldown elapses → ok,
  daily cap blocks the Nth+1 send, throttle is per (user, level).
- `TwilioSmsSender` tests with a hand-written `TwilioApi` fake: E.164-normalized recipient,
  Messaging-Service vs From-number path, delivery failure logged not thrown (no Mockito).
- `FileVerificationSendLog` tests with `@TempDir`: per-user/level counts, `lastSentAt`, survival
  across instances (restart), corrupted lines ignored, today-only counting, file created lazily.
- `VerificationControllerIT` / `VerificationThrottleIT`: cooldown resend → 429 over HTTP; burst
  beyond the per-IP bucket and daily cap → 429 with the uniform `ErrorResponse`.
- `ShelterService.addPlace`: guest → rejected (canWrite false); unverified registered → rejected;
  verified → saved as ACTIVE/USER.
