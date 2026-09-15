# Wave A / lane A3 — slug, services, controllers, tests (crisis-guidance)

Repo: `/home/aleks/MyScripts/LocalRepos/OpenShelter`, branch `feature/frontend`.
Authoritative requirements: `openspec/changes/crisis-guidance/tasks.md` (Phases 3, 5, 6), `design.md` (D3, D4, D5, D6, D11, D12), `specs/crisis-guidance/spec.md`, `specs/media-library/spec.md`. Read those parts before editing.

**You have no shell**: no compile, no test run. Two sibling lanes are creating the data layer (`A1`) and the sanitizer/media-storage pieces (`A2`) **right now**, against the same frozen contract — call them through the contract below, never create or edit their files.

## Your files

1. `guidance/SlugFactory.java` — lowercase → explicit Estonian transliteration (`õ`→o, `ä`→a, `ö`→o, `ü`→u, `š`→s, `ž`→z, plus the other diacritics you can justify) → non-alphanumeric runs to a single `-` → trim leading/trailing `-` → bound to the column width → `post` fallback when empty. Plus `isValidCustomSlug` (`^[a-z0-9]+(-[a-z0-9]+)*$`, length ≤ 200).
2. `guidance/GuidanceNotFoundException.java`, `guidance/SlugAlreadyUsedException.java` (carries the slug), `guidance/MediaAssetInUseException.java` (carries the affected posts' titles+slugs as `List<String>`). Plain `RuntimeException`s in the repo's `app/*Exception` style.
3. `guidance/GuidanceService.java` — the contract's methods with D3/D4/D5/D6/D11 semantics: DRAFT by default, PUBLISHED on explicit request; `update` is a full replace and keeps the slug when omitted; `publish` stamps `publishedAt` from the injected `Clock`; `unpublish` clears it; admin listing includes drafts (newest-updated first) while the public listing is PUBLISHED-only and pinned-first; public-by-slug is PUBLISHED-only and answers the **same 404** as an unknown slug; `delete` requires `confirm` (400 without it). **Every body write (create AND update) stores `BodySanitizer` output.** Auto-generated slug collisions take `-2`, `-3`, …; an admin-supplied collision answers 409 naming the slug (never silently rewritten); uniqueness spans drafts and published posts. Validation: title required + bounded, body required, alt mandatory iff a hero image is set (400 otherwise), alt without a hero → 400, locale defaults from `app.guidance.default-locale` when omitted, unknown id → 404. Audit (D12): publish/unpublish/delete call `recordLabeled` inside the same `@Transactional` method with the label `Guidance post "<title>" (<slug>)`; a no-op publish/unpublish writes **no** row.
4. `guidance/MediaService.java` — upload/list/delete per Phase 4 + D7/D8/D13. Validation **order**: actual byte count vs cap (413) → magic bytes (400) → sniffed type must equal the declared part type (400) → dimensions readable (400). The original filename is metadata only and **never part of a path**. The listing returns `MediaAssetWithUsage` with the reused count from ONE batched query. Deleting an unreferenced asset deletes row + file; deleting a referenced one without `confirm` → 409 naming the affected posts; with `confirm` → delete in the same transaction **and** clear `heroImageId` and `heroImageAlt` on every referencing post. The delete writes the `MEDIA_DELETE` audit row (`Media asset "<original>" (<stored>)`) in the same transaction; a refused deletion writes nothing.
5. `api/` DTOs + request records in the repo's style: `GuidancePostDto` (public: slug, title, bodyHtml, heroImageUrl or null, heroImageAlt or null, pinned, publishedAt), `AdminGuidancePostDto` (all fields incl. status/createdBy/createdAt/updatedAt), `MediaAssetDto` (storedFilename, originalFilename, contentType, width, height, sizeBytes, createdAt, reusedBy), `CreateGuidancePostRequest`, `UpdateGuidancePostRequest` (validation mirroring the service rules), and the delete-confirm request shape the repo's style prefers.
6. `api/GuidanceController.java` (public: `GET /api/guidance`, `GET /api/guidance/{slug}`), `api/MediaController.java` (`GET /api/media/{filename}` — the name must match `^[a-f0-9]{32}\.(jpg|png|webp)$` **and** `resolve(...)` must succeed; `Content-Type` from the stored type; `Cache-Control: public, max-age=31536000, immutable`; 404 otherwise), `api/AdminGuidanceController.java` (`@RequestMapping("/admin/guidance")`: list/get/create/update/publish/unpublish/delete with `confirm=true` required), `api/AdminMediaController.java` (`@RequestMapping("/admin/media")`: list/upload multipart/delete). Study `api/AdminController.java` and copy its authorization idiom exactly (the per-request admin check, exception style, javadoc conventions).
7. `config/SecurityConfig.java` — add permit-all **GET** for `/api/guidance/**` and `/api/media/**` only, in the correct order; the admin write side is already covered by the existing `/admin/**` rules. Do not restructure the chain beyond that.
8. `api/ApiErrorHandler.java` — map the new typed failures onto the existing `ErrorResponse` shape: 400, 404, 409 (slug), 409 (in-use, body carries the affected posts), 413.
9. Tests you own: `guidance/GuidanceServiceTest`, `guidance/MediaServiceTest` against the `InMemory*` fakes (draft invisibility; lifecycle incl. a no-op publish writing no audit row; ordering pinned-first with same-instant rows; slug transliteration/collision/`-2`/409; hero cases incl. alt-mandatory, replace keeping the old asset, delete-in-use clearing hero+alt while the post still serves; the upload validation matrix; delete without confirm = 400 and changes nothing; audit rows for publish/unpublish/delete of a post and of an asset) plus an endpoint-authorization test in the repo's existing style (anonymous 401 and non-admin 403 on every `/admin/guidance/*` and `/admin/media/*` route; anonymous 200 on the two public guidance routes and on `/api/media/{filename}`).

## Frozen contract (what you may call)

```java
// A1 provides
GuidancePost draft(String slug, String title, String bodyHtml, String locale, boolean pinned, Long heroImageId, String heroImageAlt, Long createdBy, Instant now);
void update(String slug, String title, String bodyHtml, String locale, boolean pinned, Long heroImageId, String heroImageAlt, Instant now);
void publish(Instant now); void unpublish(); void clearHero();
GuidancePostRepository { save, findById, findBySlug, existsBySlug, findAllForAdmin, findPublished, findPublishedBySlug, findByHeroImageId, delete }
MediaAssetRepository { save, findById, findByStoredFilename, findAll, referencedCountsByAssetId, delete }
MediaAsset create(String storedFilename, String originalFilename, String contentType, int width, int height, long sizeBytes, Long uploadedBy, Instant now);
// A2 provides
String sanitize(String rawHtml);
Optional<ImageInfo> inspect(byte[] bytes);                    // ImageInfo(contentType, width, height)
record StoredFile(String storedFilename, java.nio.file.Path path) {}
void init(); StoredFile store(byte[] bytes, String extension); void delete(String storedFilename);
Optional<java.nio.file.Path> resolve(String storedFilename); java.nio.file.Path root();
```

## Rules

Do not run git. Do not edit `openspec/changes/crisis-guidance/tasks.md` (the orchestrator ticks it). Do not touch `docs/autopilot/**`. Constructor injection, injected `Clock`, services talk to interfaces only, English comments. Never leave the tree half-built: revert a piece you cannot finish and report it open.

## Report

STATUS; files created/changed; the exact endpoint list you created (method + path) so the frontend lanes can match it; anything left open and why.
