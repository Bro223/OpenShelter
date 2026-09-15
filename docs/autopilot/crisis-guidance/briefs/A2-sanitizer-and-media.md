# Wave A / lane A2 — sanitizer + media storage (crisis-guidance)

Repo: `/home/aleks/MyScripts/LocalRepos/OpenShelter`, branch `feature/frontend`.
Authoritative requirements: `openspec/changes/crisis-guidance/tasks.md` (Phases 2 and the storage/config rows of Phase 4), `design.md` (D2, D7, D13), `specs/crisis-guidance/spec.md`, `specs/media-library/spec.md`. Read those parts before editing.

**You have no shell**: no compile, no test run. Code against the contract below VERBATIM — sibling lanes `A1` (data layer) and `A3` (services/controllers) are coding against it right now. Create only the files in your list.

## Your files

1. `pom.xml` — add `org.jsoup:jsoup` with an explicit `<version>` property following the file's own convention (see the pinned `jjwt.version` / `proj4j` / `twilio` entries) plus a comment naming WHY the sanitizer is a library rather than hand-rolled (parser differentials). This is the ONLY new dependency in the whole change and it must be the ONLY pom.xml edit.
2. `guidance/BodySanitizer.java` — the single producer of `body_html`. Element allowlist exactly `h2 h3 p br strong em ul ol li a blockquote`; attribute allowlist exactly `a[href]`; href protocol allowlist exactly `http`, `https`, `mailto`; no `target`; returns the sanitized HTML string (`null`/blank → `""`). Use jsoup's `Cleaner`/`Safelist` so the allowlist is declarative.
3. `guidance/MediaImageInspector.java` — magic-byte sniffing (JPEG `FFD8FF`, PNG `89504E47`, WebP `RIFF....WEBP`) plus a dependency-free header dimension reader (PNG `IHDR`, JPEG `SOFn` scan, WebP `VP8`/`VP8L`/`VP8X`). `Optional.empty()` when the bytes are not one of the three formats or the dimensions are unreadable. `ImageIO` has no WebP reader — that is why this is hand-rolled.
4. `guidance/MediaStorage.java` — `init()` creates the configured directory (fail the boot with a clear message when it cannot be created or written); `store(bytes, extension)` writes a 32-hex name + "." + extension; `delete(name)`; `resolve(name)` resolves under the root with a **parent-equality check** so it can never escape; `root()` for tests.
5. `guidance/UnsupportedImageException.java`, `guidance/MediaTooLargeException.java` — plain `RuntimeException`s in the repo's `app/*Exception` style.
6. `src/main/resources/application.yml` **and** the mirror `src/test/resources/application.yml` — `app.media.upload-dir: ${MEDIA_UPLOAD_DIR:data/media}`, `app.media.max-bytes: ${MEDIA_MAX_BYTES:5242880}`, `app.guidance.default-locale: ${GUIDANCE_DEFAULT_LOCALE:en}`, each with a WHY comment in the file's style; and `spring.servlet.multipart.max-file-size` / `max-request-size` at 6MB with a comment explaining that our own cap must produce the documented 413 instead of the servlet container's default rejection. Keep the two files in sync.
7. `.gitignore` — an explicit `data/media/` entry with a one-line reason (the default dir already sits under the ignored `data/` tree).
8. Tests (`src/test/java/ee/sheltermap/guidance/`):
   - `BodySanitizerTest` as the **specification** of the sanitizer: allowlisted elements survive; `h1`, `img`, `table`, `iframe`, `svg`, `style`, `script` do not; `onclick`/`onerror`/`onload` and inline `style` do not; `javascript:`/`data:` hrefs dropped and `http`/`https`/`mailto` kept; malformed/unclosed markup handled; **idempotence** `sanitize(sanitize(x)) == sanitize(x)`; an XSS kit payload set (`<img src=x onerror=…>`, `<svg/onload=…>`, `<ScRiPt>`, uppercase attribute names, entity-encoded `<`) producing output with no script node and no handler attribute.
   - `MediaImageInspectorTest` with fixture byte arrays (a minimal valid PNG, a JPEG, a WebP, plus text bytes, an SVG, and a truncated header).
   - `MediaStorageTest` (`@TempDir`): generated name matches `^[a-f0-9]{32}\.(jpg|png|webp)$`; `resolve` rejects traversal and absolute names; `delete` removes the file.

## Frozen contract

```java
String sanitize(String rawHtml);                                   // BodySanitizer
record ImageInfo(String contentType, int width, int height) {}      // MediaImageInspector
Optional<ImageInfo> inspect(byte[] bytes);
record StoredFile(String storedFilename, java.nio.file.Path path) {}
void init(); StoredFile store(byte[] bytes, String extension);
void delete(String storedFilename);
Optional<java.nio.file.Path> resolve(String storedFilename);
java.nio.file.Path root();                                         // MediaStorage
```

## Rules

Do not run git. Do not edit `openspec/changes/crisis-guidance/tasks.md`. Do not touch `docs/autopilot/**`. Never leave the tree half-built: revert a piece you cannot finish and report it open. English comments only, injected `Clock` where a time is needed, no other new dependency.

## Report

STATUS; files created/changed; the exact config keys/values you added; the sanitizer's final allowlist; anything left open.
