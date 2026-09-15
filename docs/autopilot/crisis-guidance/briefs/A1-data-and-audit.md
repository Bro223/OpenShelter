# Wave A / lane A1 — data layer + audit extension (crisis-guidance)

Repo: `/home/aleks/MyScripts/LocalRepos/OpenShelter`, branch `feature/frontend`.
Authoritative requirements: `openspec/changes/crisis-guidance/tasks.md` (Phase 1), `design.md` (D1, D6, D12), `specs/crisis-guidance/spec.md`, `specs/media-library/spec.md`. Read the Phase 1 + D1/D12 parts before editing.

**You have no shell**: you cannot compile or run tests. Code against the contract below VERBATIM (exact names, signatures, packages) — two sibling lanes (`A2`, `A3`) are coding against it right now. Create only the files in your list.

## Your files

1. `src/main/resources/db/migration/V23__crisis_guidance.sql` — exactly the schema in tasks.md Phase 1: `media_assets` (+ `filename` UNIQUE, `content_type` CHECK in image/jpeg|image/png|image/webp, `width`/`height`/`size_bytes` CHECK > 0, `uploaded_by` REFERENCES users ON DELETE SET NULL, `created_at`) and `guidance_posts` (+ `slug` UNIQUE, `locale` NOT NULL, `status` CHECK in DRAFT|PUBLISHED, `pinned` NOT NULL DEFAULT false, `hero_image_id` REFERENCES media_assets ON DELETE SET NULL, `hero_image_alt`, `published_at`, `created_by`, `created_at`, `updated_at`) with **both CHECKs** — alt mandatory iff a hero image is set, and `(status = 'PUBLISHED') = (published_at IS NOT NULL)` — plus the partial index `(pinned DESC, published_at DESC) WHERE status = 'PUBLISHED'`, indexes on `guidance_posts (hero_image_id)` and `media_assets (created_at)`, and `ALTER TABLE moderation_actions ADD COLUMN subject_label VARCHAR(300) NULL`.
   Header comment in the repo's V22 style: what the tables are, WHY the hero is an id reference (never a URL or a copy), WHY `subject_label` deliberately has no FK, and the `ddl-auto=validate` note. Study `V22__shelter_open_status.sql`, `V9` and `V10` for formatting.
2. `domain/GuidanceStatus.java`, `domain/GuidancePost.java`, `domain/MediaAsset.java` — pure Java, **no Spring import in `domain/`** (a verified repo invariant).
3. `guidance/GuidancePostRepository.java`, `guidance/MediaAssetRepository.java` — the plain interfaces (below).
4. `persistence/`: `GuidancePostEntity`, `MediaAssetEntity` + mappers, `SpringDataGuidancePostRepository`, `SpringDataMediaAssetRepository`, `JpaGuidancePostRepository`, `JpaMediaAssetRepository` (implementing the guidance interfaces). Study `JpaShelterRepository` + its entity/mapper for the house style. Every mapped column must exist in V23 with the same shape so `ddl-auto=validate` stays green. `referencedCountsByAssetId()` must be ONE batched query (no N+1).
5. `src/test/java/ee/sheltermap/guidance/InMemoryGuidancePostRepository.java`, `InMemoryMediaAssetRepository.java` — fakes with the **ordering rules implemented** (the ordering tests assert through them). Study the existing `InMemory*` fakes for style.
6. The D12 audit extension: `app/ModerationAuditLog` (4 new `Action` values `GUIDANCE_PUBLISH`, `GUIDANCE_UNPUBLISH`, `GUIDANCE_DELETE`, `MEDIA_DELETE`; `Row` gains `String subjectLabel`; ONE new overload `recordLabeled(long moderatorId, Action action, String subjectLabel, String reason)`), its `persistence/JpaModerationAuditLog` implementation (the `subject_label` column), and `api/AdminModerationService.auditSubjectName` resolving `subjectLabel` FIRST with the existing shelter/account fallback when null. **The existing `record(...)` signature and every call site stay untouched.**

## Frozen contract

```java
// domain
enum GuidanceStatus { DRAFT, PUBLISHED }
static GuidancePost draft(String slug, String title, String bodyHtml, String locale, boolean pinned,
                          Long heroImageId, String heroImageAlt, Long createdBy, Instant now);
void update(String slug, String title, String bodyHtml, String locale, boolean pinned,
            Long heroImageId, String heroImageAlt, Instant now);
void publish(Instant now); void unpublish(); void clearHero();
boolean isPublished(); boolean isPinned(); /* + getters for every field */
static MediaAsset create(String storedFilename, String originalFilename, String contentType,
                         int width, int height, long sizeBytes, Long uploadedBy, Instant now);

// guidance
interface GuidancePostRepository {
  GuidancePost save(GuidancePost post);
  Optional<GuidancePost> findById(long id);
  Optional<GuidancePost> findBySlug(String slug);
  boolean existsBySlug(String slug);
  List<GuidancePost> findAllForAdmin();     // updatedAt desc, id desc
  List<GuidancePost> findPublished();       // pinned desc, publishedAt desc, id desc
  Optional<GuidancePost> findPublishedBySlug(String slug);
  List<GuidancePost> findByHeroImageId(long mediaAssetId);
  void delete(GuidancePost post);
}
interface MediaAssetRepository {
  MediaAsset save(MediaAsset asset);
  Optional<MediaAsset> findById(long id);
  Optional<MediaAsset> findByStoredFilename(String storedFilename);
  List<MediaAsset> findAll();               // createdAt desc, id desc
  Map<Long, Long> referencedCountsByAssetId();
  void delete(MediaAsset asset);
}
```

## Rules

Do not run git. Do not edit `openspec/changes/crisis-guidance/tasks.md` (the orchestrator ticks it). Do not touch `docs/autopilot/**` except appending one line to `docs/autopilot/RUNLOG.md` if you close something. Never leave the tree half-built: if a piece cannot be finished safely, revert that piece and report it open. English comments only.

## Report

STATUS; files created/changed; the exact V23 column list you wrote (so the other lanes can rely on it); anything left open and why.
