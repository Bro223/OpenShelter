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
| `TwilioSmsSender` | class | Real SMS via Twilio SDK. (Step 2 may stub the SDK call — wire it for real in a later step if credentials exist.) |
| `DevSmsSender` | class | Logs the code to console — free dev + CI. |
| `SmtpSender` | interface | `send(email: String, message: String): void`. |
| `DevSmtpSender` | class | Logs the token to console. (Real JavaMail impl optional — reset email can use the dev sender for now.) |
| `VerificationService` | class | holds `providers: Map<VerificationLevel, VerificationProvider>`; `requestVerification(user, level): void`, `confirmVerification(user, level, code): boolean`, `revoke(user, level): void`. **Owns all persistence**: saves `PendingVerification` on request; on successful confirm saves a `VerificationClaim` and attaches it to the user. |
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
