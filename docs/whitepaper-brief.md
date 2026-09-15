# OpenShelter — One-Page Brief

**What it is.** A full-stack web app that turns Estonia's official shelter
registry (Päästeamet open data, ~300 shelters, refreshed weekly) into a public,
browsable, community-verified shelter map. Spring Boot + PostgreSQL backend,
Angular 22 + Leaflet frontend.

## What the app does

**Accounts & security**

- Register (name, email, phone, password — no national ID code) → login → logout.
  Argon2id password hashing; JWT access tokens (15 min) + refresh tokens (30 days,
  hashed at rest, rotated on every refresh).
- **Password reset** — emailed 6-digit code (works even if you're locked out);
  single-use, 5 attempts, revokes all sessions on success.
- **Identity verification** — email OTP (8-char code) and phone OTP (6-digit SMS),
  plus a Smart-ID stub. Verified users unlock writing (submit shelters, file reports).
- **Cross-channel contact change** — changing your email is confirmed by an SMS code
  sent to your current phone; changing your phone by an email code sent to your current
  email. Stealing one channel is never enough to hijack the account.
- **Account page** — real profile + real verification status (`/account/me`),
  password-confirmed edit of name, the "My contributions" list of your own
  shelters, data export + account deletion.
- **Abuse prevention** — every send/attempt path is rate-limited (per-IP + per-user
  buckets), 60s resend cooldowns, 5-sends/day cap per channel (file-backed, survives
  restarts), anti-enumeration everywhere (login and reset always answer the same).
- **Privacy by architecture** — e-mail/phone are AES-256-GCM encrypted at rest behind
  a blind index (a stolen DB dump does not reveal identities); the app refuses to
  boot without the keys.
- **Your data** — export it as JSON; delete the account (private data purged, your
  public shelters stay on the map without the authorship link).

**Browsing (public, no login)**

- Leaflet **map** of all shelters + synchronized list; **provenance markers + legend**
  (Registry / New by community / Confirmed by community / Reported — the four public
  values the map renders) with a matching filter; trust filters (Open — client-side /
  Has capacity).
- Shelter **detail page** — name, address, coordinates,
  capacity, description, provenance badge,
  **last-verified line** + community-report count, current occupancy
  ("Reported full" while fresh), **"Navigate" / "Open in Apple Maps"** deep links
  and straight-line distance-from-you.
- **Community reports** — report a shelter ("does not exist" / "closed" /
  "confirmed open" / "wrong location" / other — the **5th trust-weighted "does not
  exist" report takes the shelter off the public map**, admin-restore only, never
  re-hidden), report the live open/closed state, or report how full it is right
  now (shown to everyone while fresh).

**Contributing (verified users)**

- **Submit a shelter** — name, address (free-text or Google Maps link, auto-resolved
  to coordinates, Estonia-bounded), capacity, description; listed immediately as
  **Proposed** (no moderation) — community confirmations move it to
  Community-reported. Caps: 10 active shelters, 5 per rolling day, near-duplicate
  detection (same name + ≤100 m → 409).
- **Manage your own submissions** — list, edit, or delete your own shelters from the
  account page ("My contributions"); author-only, registry rows unmanageable.
- **Report & confirm** — verified users file typed reports (shelter / occupancy /
  open status), one per user per target. The quality mechanism is community reports,
  worked after the fact by a single env-provisioned admin (report queues, mark
  inaccurate, request info, suspend; every action audited; registry rows are
  read-only). There is no star rating — the review model was removed
  (`V21__drop_reviews.sql`).

**Data (the living registry)**

- **Weekly automatic ingestion** of the Päästeamet open-data CSV (Mon 03:00
  Europe/Tallinn; Last-Modified versioning — a 304 is a no-op, not a failure),
  coordinates reprojected EPSG:3301 → WGS84. The importer creates/updates/delists
  **registry rows only** — user submissions are never touched. Every run is audited
  and the footer shows source + official open-data link + last-import date.

**UI**

- 11 routes: map (default), shelter detail, submit, login, register, reset, verify,
  account, privacy, terms, admin (the moderation panel). High-contrast accessibility
  theme toggle (near-black background with blue/orange accents), design-token system,
  fluid layout that survives narrow viewports,
  **bilingual EN/ET switcher** (app chrome translated, feature pages in progress),
  crisis-first (one primary action per screen, words beside every color-coded
  status).

## Quality bar

788 backend + 953 frontend automated tests (re-counted 2026-09-15; 706/887 was the
2026-09-13 snapshot); PostgreSQL
integration tests via Testcontainers; three completed security/review efforts —
2026-09-08 campaign (reset-code brute-force, XFF-spoofing fix, fail-closed prod JWT
guard), 2026-09-11 wave (uniqueness races, transactional import, N+1 removal,
canonical phone/email, Twilio fail-fast, full-history secret scan), 2026-09-13
twelve-attack threat model + operations runbook + 15 API security pins;
architecture docs (PlantUML + build packs) re-synced to code after every milestone.

**Status (13 Sept 2026; test counts refreshed 2026-09-15).** Fully functional end-to-end
(register → verify → browse → submit → report → manage), bilingual app chrome (ET/EN);
the crisis-guidance authoring/publishing backend landed after this date and its public and
admin UI are the next wave. Remaining: real
Smart-ID integration, i18n feature-page copy (in progress) + RUS/UA, saved shelters,
PWA offline cache, production deployment.
