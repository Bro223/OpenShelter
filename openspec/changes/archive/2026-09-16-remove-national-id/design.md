# Design: remove-national-id

## Context

The `users.national_id_code` column (V1) backs a field that registration
requires (`@NotBlank`) and the account page allows editing, but no code
path reads it for any decision: no checksum validation exists, no query
uses it, and the SMART_ID verification level is a stub that by design
never stores a code (its future flow proves identity via PKI externally).
The only runtime "use" is the admin seeder, which writes the empty string
`""` for the provisioned admin and reuses it as the SMART_ID claim's
`external_ref`.

## Decisions

- **D1 — Drop the column in V12 (single `ALTER TABLE ... DROP COLUMN`),
  no deprecate-then-drop staging.** Nothing reads the value, no external
  consumer exists, and no other table references it. Both the dev and the
  IT database are the shared local PostgreSQL driven by the same Flyway
  history (`ddl-auto: validate`), so one migration covers both.

- **D2 — Profile edit becomes name-only.** The edit feature existed to
  fix a national-ID typo; with the field gone, only `changeName`
  remains (still password-confirmed — a stolen session cannot rewrite
  the identity anchor). `RegisteredUser.changeNationalIdCode` is
  deleted with the field.

- **D3 — SMART_ID stays grantable-later, code-free.** The enum value,
  the stub `SmartIdVerificationProvider`, the controller's 400
  rejection, and the FE's hidden state all stay exactly as they are.
  The stub's contract already says what the real flow will be: start a
  session + poll, the provider proves identity itself, and the claim's
  `external_ref` carries whatever external reference that flow returns.
  No user-input code is ever stored — by this design and by the future
  one.

- **D4 — Provisioned admin claim ref = the admin e-mail.**
  `verification_claims.external_ref` is `NOT NULL`; the former value was
  `""` (meaningless). Using the e-mail matches the PHONE claim, which
  already carries the e-mail "the account's real contact" for the same
  provisioned admin. It is a stable, non-sensitive placeholder.

- **D5 — Spec delta lives in this change directory.** Repo convention
  (see the map-crisis-actions archive commit): in-flight changes carry
  spec deltas; the main `openspec/specs/account-profile/spec.md` is
  synced at archive time. The delta REMOVES the national-ID half of the
  profile-edit requirement, MODIFIES the profile-fetch requirement
  (no `nationalIdCode` in the response — the current text includes
  `isAdmin` from the in-flight admin-moderation delta), and MODIFIES
  the account-page requirement (identity section is name-only).

## Consequences

- `RegisterRequest` / `ProfileUpdateRequest` / `MeResponse` shrink by
  one component each; every BE IT and FE fixture that carried
  `nationalIdCode` is updated in the same change (compilation + tests
  catch stragglers).
- Old tokens/sessions are unaffected (the field was never in a token).
- The protected dev server keeps running the old build until the owner
  restarts it (standing rule); the shared DB is already past V11, so V12
  landing under the running server only matters after that restart.
