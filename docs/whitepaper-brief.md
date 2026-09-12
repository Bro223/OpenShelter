# OpenShelter — One-Page Brief

**What it is.** A full-stack web app that turns Estonia's official bomb-shelter
registry (Maa-amet WFS, ~300 shelters) into a public, browsable, community-verified
shelter map. Spring Boot + PostgreSQL backend, Angular 22 + Leaflet frontend.

## What the app does

**Accounts & security**
- Register (name, email, phone, Estonian personal code, password) → login → logout.
  Argon2id password hashing; JWT access tokens (15 min) + refresh tokens (30 days,
  hashed at rest, rotated on every refresh).
- **Password reset** — emailed 6-digit code (works even if you're locked out);
  single-use, 5 attempts, revokes all sessions on success.
- **Identity verification** — email OTP (8-char code) and phone OTP (6-digit SMS),
  plus a Smart-ID stub. Verified users unlock writing (submit shelters, review).
- **Cross-channel contact change** — changing your email is confirmed by an SMS code
  sent to your current phone; changing your phone by an email code sent to your current
  email. Stealing one channel is never enough to hijack the account.
- **Account page** — real profile + real verification status (`/account/me`),
  password-confirmed edit of name/personal code, list of all your reviews.
- **Abuse prevention** — every send/attempt path is rate-limited (per-IP + per-user
  buckets), 60s resend cooldowns, 5-sends/day cap per channel (file-backed, survives
  restarts), anti-enumeration everywhere (login and reset always answer the same).

**Browsing (public, no login)**
- Leaflet **map** of all shelters + synchronized list; source filter
  (all / registry / user-submitted).
- Shelter **detail page** — name, address, county/municipality, coordinates,
  capacity, description, provenance (Registry vs Community), average rating and
  review count, **"Navigate" / "Open in Apple Maps"** deep links.
- **Reviews** — public review list per shelter.

**Contributing (verified users)**
- **Submit a shelter** — name, address (free-text or Google Maps link, auto-resolved
  to coordinates, Estonia-bounded), capacity, description; listed immediately (no
  moderation).
- **Manage your own submissions** — list, edit, or delete your own shelters from the
  account page ("My contributions"); author-only, registry rows unmanageable.
- **Rate & review** — one review per user per shelter (re-rating updates), author-only
  update/delete. Community ratings are the quality mechanism — there is no moderator.

**Data (the living registry)**
- **Weekly automatic ingestion** from the Maa-amet WFS layer (Mon 03:00
  Europe/Tallinn), coordinates reprojected EPSG:3301 → WGS84. The importer creates/
  updates/delists **registry rows only** — user submissions are never touched.

**UI**
- 8 routes: map (default), shelter detail, submit, login, register, reset, verify,
  account. High-contrast (black/yellow) accessibility theme toggle, design-token
  system, responsive down to narrow screens, crisis-first (one primary action per
  screen, words beside every color-coded status).

## Quality bar

360 backend + 588 frontend automated tests, all green; PostgreSQL integration tests
via Testcontainers; two completed security/code-review campaigns (uniqueness races,
transactional import, N+1 removal, canonical phone/email, Twilio fail-fast,
reset-code brute-force fix, prod JWT guard); architecture docs (PlantUML + build
packs) re-synced to code after every milestone.

**Status (Sept 2026).** Fully functional end-to-end (register → verify → browse →
submit → review → manage). Remaining: real Smart-ID integration, i18n
(EST/EN/RUS/UA), saved shelters, community status reports, PWA offline cache,
production deployment.
