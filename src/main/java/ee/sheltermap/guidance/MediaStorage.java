package ee.sheltermap.guidance;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.ArrayList;
import java.util.List;
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
 *
 * <p>P2-9 derivatives: a derivative of a stored file {@code <hex32>.<ext>}
 * sits BESIDE it as {@code <hex32>-t<width>.<ext>} (the derived name is
 * computed by {@link MediaDerivatives#derivativeName} from a base that
 * must already satisfy the serving contract — the derivative inherits
 * the base's extension, so it is served with the original's stored
 * content type). {@link #deleteWithDerivatives} removes the whole set,
 * and {@link #derivativeWidthsPresent} answers which widths exist — the
 * filesystem is the srcset's truth (an asset uploaded before the
 * feature, or a WebP original, simply has none).
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
     * Write a derivative of a stored file beside it (P2-9): the name is
     * DERIVED from the original's generated name (same stem, the
     * {@code -t<width>} marker, the same extension) — the derivative
     * can therefore never land outside the original's name space, and
     * the serving endpoint resolves it back to the original's asset row.
     * Same discipline as {@link #store}: CREATE_NEW, the parent-equality
     * resolve gate, the initialized check.
     *
     * @param originalFilename the ORIGINAL's generated name (it must
     *                         satisfy the serving contract)
     * @param width            one of {@link MediaDerivatives#WIDTHS}
     * @throws IllegalArgumentException the base is outside the contract,
     *                                  or the width is not a derivative
     *                                  width
     */
    public StoredFile storeDerivative(String originalFilename, int width, byte[] bytes) {
        Objects.requireNonNull(bytes, "bytes");
        String name = MediaDerivatives.derivativeName(originalFilename, width);
        if (!initialized) {
            init(); // defensive: the bean wiring calls init() at boot
        }
        Path path = root.resolve(name);
        try {
            // CREATE_NEW: the base name is never reused, so the derived
            // name is never reused either — a pre-existing file is a
            // collision, not a re-render.
            Files.write(path, bytes, StandardOpenOption.CREATE_NEW);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot write the media derivative " + name, e);
        }
        return new StoredFile(name, path);
    }

    /**
     * The derivative widths that EXIST on disk for a stored file (P2-9,
     * ascending) — the srcset is built from this, never from the row:
     * the filesystem is the truth, so an asset without derivatives (a
     * pre-feature upload, a WebP original, a skipped decode) answers
     * empty and its slots render the original via plain {@code src}.
     * A name outside the contract answers empty (it has no name space).
     */
    public List<Integer> derivativeWidthsPresent(String storedFilename) {
        if (storedFilename == null || !MediaDerivatives.BASE_NAME.matcher(storedFilename).matches()) {
            return List.of();
        }
        List<Integer> present = new ArrayList<>();
        for (int width : MediaDerivatives.WIDTHS) {
            Optional<Path> path = resolve(MediaDerivatives.derivativeName(storedFilename, width));
            if (path.isPresent() && Files.isRegularFile(path.get())) {
                present.add(width);
            }
        }
        return List.copyOf(present);
    }

    /**
     * Remove a stored file AND every derivative that exists beside it
     * (P2-9): the asset deletion must not leave orphan thumbnails the
     * serving endpoint would 404-look-up against a gone row. Idempotent
     * like {@link #delete} (a concurrent delete already removed them).
     */
    public void deleteWithDerivatives(String storedFilename) {
        delete(storedFilename);
        for (int width : derivativeWidthsPresent(storedFilename)) {
            delete(MediaDerivatives.derivativeName(storedFilename, width));
        }
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
