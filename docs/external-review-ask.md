# OpenShelter — external review ask

**What this is.** A checklist for an outside reviewer — a municipality contact, a
university researcher, or a civil-protection / public-administration professional —
who is asked to review OpenShelter. It is the cover sheet of the review package: it
says what the project is, what we want you to look at, what we deliberately do *not*
want re-decided, and how to get your feedback back to us.

**Package date:** 2026-09-13 · **Code state:** branch `feature/frontend`, commit
`ab3c488` (M15) · **Test state at that commit:** 706 backend + 887 frontend automated
tests. (Re-counted at the current head, 2026-09-15: 788 backend + 953 frontend, green.)

## 1. What the project is (60 seconds)

OpenShelter is a community-verified shelter map for Estonia. It ingests the official
Päästeamet open-data shelter registry (~300 locations) weekly, lets verified
community members add shelters and review them, and keeps the map honest with
community reports instead of a moderator: the fifth trust-weighted "does not exist"
report takes a shelter off the public map. A single env-provisioned admin works the
report queues after the fact; everything they do is audited. The design is
crisis-first: public reads need no login, the UI is bilingual (ET/EN), high-contrast,
responsive down to 360 px, and the app never does IP geolocation.

The one-page brief (`docs/whitepaper-brief.md`) is the fastest way in; the whitepaper
(`docs/whitepaper.md`, v1.1) is the full picture.

## 2. Suggested reading order

1. `docs/whitepaper-brief.md` — one page.
2. `docs/whitepaper.md` — design thesis, system, security, roadmap.
3. `docs/security/threat-model.md` — the twelve-attack model with the mitigations,
   status and pinning test per attack, plus the residual-risk register.
4. `docs/security/operations.md` — environments, backups, monitoring, incident list.
5. `README.md` — the shipped API surface and the production checklist.
6. The code, if you want to go deeper: `src/main/java/ee/sheltermap/` (backend,
   strict dependency rule `domain` ← `app`/`verification` ← `api`/`auth`/
   `ingestion`) and `frontend/src/app/` (Angular 22, standalone components).

## 3. What we want reviewed (the checklist)

Tick what you can judge; skip what you can't — partial feedback is welcome.

### Data & provenance

- [ ] Is the official-dataset pipeline credible? (Päästeamet open-data CSV, weekly,
      Last-Modified versioning, per-run audit in `data_imports`, public
      `GET /api/data-source` + footer transparency.)
- [ ] Is the per-row "last verified" + report-count display honest about freshness?
- [x] **Decided (2026-09-16):** the publisher states no licence for the CSV, so the
      application names none. It credits the publisher (Päästeamet /
      Siseministeerium), links the dataset, and the footer notes that the coordinates
      are transformed (EPSG:3301 → WGS84) — the attribution duty a CC BY-style licence
      would carry, without asserting terms. Flag it if you think another stance is
      warranted for a public deploy.
- [ ] The provenance taxonomy (server values: Official / Partner / Community-reported /
      Proposed / Reported-inactive / Rejected; the map legend renders the four public
      ones as Registry / New by community / Confirmed by community / Reported) — does the
      vocabulary make the trust model legible to a
      non-technical user?

### The no-pre-publication-moderation model

- [ ] Community reports (auto-hide at the fifth trust-weighted "does not exist";
      review reports hide at five; live occupancy reports are display-only) + one
      env-provisioned admin working the queues after the fact — is this a sound
      trust model for a crisis-context map, or does it need a second human layer?
- [ ] Ratings were demoted in M11 and then **removed entirely in V21**
      (`V21__drop_reviews.sql` drops `shelter_reviews` + `review_reports`, and the
      `minRating` filter is gone) — does the removal read as an improvement or a
      regression?
- [ ] Are the abuse valves sufficient without CAPTCHA (a locked decision): 10 report
      actions per rolling hour per user, 5 submissions per rolling day, 10 active
      shelters, near-duplicate 409, per-IP/per-contact token buckets?

### Privacy

- [ ] PII at rest: e-mail/phone AES-256-GCM + HMAC blind index, fail-closed keys, no
      national ID code collected, data export (`GET /account/export`) + account
      erasure (`DELETE /account`). Does the posture match what you would expect of a
      civic app?
- [ ] **Open question for you:** the data-retention schedule is an owner decision
      still in the open (how long to keep inactive accounts and audit rows). What
      retention horizon would you consider appropriate, and how should it
      be stated on the privacy page?
- [ ] The privacy policy and terms (`/privacy`, `/terms`) — anything misleading or
      missing?

### Security

- [ ] `docs/security/threat-model.md` — of the twelve attacks and their statuses,
      which mitigation do you consider weakest?
- [ ] The residual-risk register (7 items) — any risk you would not accept for a
      system used in a crisis?
- [ ] `docs/security/operations.md` — are the backup/restore and
      staging-vs-production procedures sufficient for a small team?

### Crisis UX & i18n

- [ ] Crisis-first UX: one primary action per screen, high-contrast theme, words
      beside every color-coded status, responsive to 360 px. What would you change?
- [ ] Estonian/English parity: the app chrome is fully bilingual; feature-page copy
      is in progress. Anything in the English copy that must not be lost in
      translation?

### Deployment readiness

- [ ] Single-instance constraint (in-memory rate limits), fail-closed boot guards,
      env-only secrets, pg_dump backup/restore — what is missing for a real deploy to
      a government host?

## 4. What we do NOT want re-decided (locked decisions)

These are product decisions the project has already made and pinned in OpenSpec.
Flagging a problem with them is welcome; the default is "the decision stands": no
CAPTCHA; private homes stay usable (badge + warning, never hidden); no active
(pre-publication) moderation; the nearest-shelter computation is client-side; the app
never does IP geolocation; the official dataset is the Päästeamet open-data CSV.

## 5. How to send feedback

- **Format:** anything — margin notes, a markdown list, a filled copy of §3, or
  "three things I'd change". Structured is fine, a paragraph is fine.
- **Send to:** Aleks Bratsun (project owner) — `aleks.bratsun@reaktiiv.com`, subject
  **"OpenShelter review"**.
- **What to reference:** the commit you reviewed (`ab3c488` for this package) so
  feedback can be matched to code.
- **Response time:** the project is maintained by a single student (TalTech MSc);
  feedback is read in the order it arrives and answered in the next maintenance pass.
