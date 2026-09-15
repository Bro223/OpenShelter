package ee.sheltermap.guidance;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * File store for the crisis-guidance media library (crisis-guidance D7).
 *
 * <p>Uploads land under the configured directory
 * ({@code app.media.upload-dir}) as
 * {@code <32 hex from a UUID>.<sniffed extension>}. The name is generated
 * by the server and is the access control on the public serving path —
 * the client's filename is display metadata only and never reaches
 * this class. Generated names are never reused, so served files are safe
 * to cache as immutable.
 *
 * <p>{@link #init()} is the boot-time gate (called from the bean wiring):
 * it creates the directory when missing and FAILS THE BOOT (
 * {@link IllegalStateException}) when the directory cannot be created or
 * is not writable — the fail-closed habit of {@code PiiKeys} /
 * {@code ProdJwtGuard}, so a misconfigured deployment is discovered at
 * deploy time rather than on the first upload.
 */
public class MediaStorage {

    /**
     * The extensions a stored name may carry — exactly the extensions the
     * sniffed content types imply, so every generated name satisfies the
     * serving endpoint's {@code ^[a-f0-9]{32}\.(jpg|png|webp)$} contract.
     */
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "png", "webp");

    private final Path root;
    private boolean initialized;

    public MediaStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
    }

    /**
     * Create the upload directory when missing and fail the boot with a
     * clear message when it cannot be created or is not writable.
     * Idempotent — safe to call more than once.
     */
    public void init() {
        try {
            Files.createDirectories(root);
        } catch (IOException e) {
            throw new IllegalStateException(
                    "Cannot create the media upload directory " + root
                            + " — check the MEDIA_UPLOAD_DIR setting (crisis-guidance D7): "
                            + e.getMessage(), e);
        }
        if (!Files.isWritable(root)) {
            throw new IllegalStateException(
                    "The media upload directory " + root + " is not writable — check the "
                            + "MEDIA_UPLOAD_DIR setting (crisis-guidance D7)");
        }
        initialized = true;
    }

    /**
     * Write the bytes under a generated 32-hex name.
     *
     * @param bytes     the uploaded bytes
     * @param extension the extension implied by the SNIFFED type
     *                  ({@code jpg}, {@code png} or {@code webp})
     * @return the generated filename and the absolute path written
     */
    public StoredFile store(byte[] bytes, String extension) {
        Objects.requireNonNull(bytes, "bytes");
        Objects.requireNonNull(extension, "extension");
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException(
                    "Unsupported media extension: " + extension
                            + " (expected the sniffed type — one of " + ALLOWED_EXTENSIONS + ")");
        }
        if (!initialized) {
            init(); // defensive: the bean wiring calls init() at boot
        }
        String name = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        Path path = root.resolve(name);
        try {
            // CREATE_NEW: generated names are never reused, so any
            // pre-existing file is a collision, not a re-upload.
            Files.write(path, bytes, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot write the media file " + name, e);
        }
        return new StoredFile(name, path);
    }

    /**
     * Remove a stored file. Unknown or unresolvable names are a no-op —
     * deletion is idempotent (a concurrent delete already removed it).
     */
    public void delete(String storedFilename) {
        Optional<Path> path = resolve(storedFilename);
        if (path.isEmpty()) {
            return;
        }
        try {
            Files.deleteIfExists(path.get());
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot delete the media file " + storedFilename, e);
        }
    }

    /**
     * Resolve a stored filename strictly under the upload root.
     *
     * <p>Two gates: names carrying a path separator (forward OR back
     * slash), a null byte, or being {@code .}/{@code ..} are refused
     * outright; and the normalized resolved path must have the root
     * itself as its parent — the parent-equality check — so even a name
     * that slipped past the serving endpoint's regex can never land
     * outside the directory.
     *
     * @return the absolute path under the root, or empty when the name
     *         is not a plain file name directly under the root
     */
    public Optional<Path> resolve(String storedFilename) {
        if (storedFilename == null || storedFilename.isEmpty()) {
            return Optional.empty();
        }
        if (storedFilename.indexOf('/') >= 0 || storedFilename.indexOf('\\') >= 0
                || storedFilename.indexOf('\0') >= 0) {
            return Optional.empty();
        }
        Path candidate = root.resolve(storedFilename).normalize();
        if (!root.equals(candidate.getParent())) {
            return Optional.empty();
        }
        return Optional.of(candidate);
    }

    /** The absolute, normalized upload root (exposed for tests and the serving path). */
    public Path root() {
        return root;
    }

    /** A file written by {@link #store}: the generated name plus its absolute path. */
    public record StoredFile(String storedFilename, Path path) {
    }
}
