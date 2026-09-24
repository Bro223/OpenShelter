package ee.sheltermap.guidance;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatNoException;

/**
 * The file store behind the media library: the
 * generated-name contract, the parent-equality resolve gate and
 * idempotent deletion.
 */
class MediaStorageTest {

    private static final String NAME_CONTRACT = "^[a-f0-9]{32}\\.(jpg|png|webp)$";

    @TempDir
    Path tempDir;

    private MediaStorage storage() {
        MediaStorage storage = new MediaStorage(tempDir.resolve("media"));
        storage.init();
        return storage;
    }

    @Test
    void storeGeneratesANameInTheServingContract() throws Exception {
        MediaStorage storage = storage();
        byte[] bytes = "some image bytes".getBytes();
        MediaStorage.StoredFile stored = storage.store(bytes, "png");

        assertThat(stored.storedFilename()).matches(NAME_CONTRACT);
        assertThat(stored.path()).isEqualTo(storage.root().resolve(stored.storedFilename()));
        assertThat(stored.path()).exists();
        assertThat(Files.readAllBytes(stored.path())).containsExactly(bytes);
    }

    @Test
    void storeNeverReusesAName() {
        MediaStorage storage = storage();
        assertThat(storage.store(new byte[]{1}, "jpg").storedFilename())
                .isNotEqualTo(storage.store(new byte[]{1}, "jpg").storedFilename());
    }

    @Test
    void storeRejectsAnExtensionOutsideTheSniffedSet() {
        assertThatThrownBy(() -> storage().store(new byte[]{1}, "gif"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void resolveReturnsTheStoredFileDirectlyUnderTheRoot() {
        MediaStorage storage = storage();
        String name = storage.store(new byte[]{1}, "webp").storedFilename();
        Optional<Path> resolved = storage.resolve(name);
        assertThat(resolved).isPresent();
        assertThat(resolved.get()).isEqualTo(storage.root().resolve(name));
        assertThat(resolved.get().getParent()).isEqualTo(storage.root());
    }

    @Test
    void resolveRejectsTraversalAndAbsoluteNames() {
        MediaStorage storage = storage();
        for (String name : new String[]{
                "../../etc/passwd",
                "../media/x.jpg",
                "sub/x.jpg",
                "a/b.jpg",
                "/etc/passwd",
                "C:\\Windows\\win.ini",
                "..",
                ".",
                "",
                null}) {
            assertThat(storage.resolve(name)).as("name: %s", (Object) name).isEmpty();
        }
    }

    @Test
    void deleteRemovesTheFile() {
        MediaStorage storage = storage();
        String name = storage.store(new byte[]{1, 2, 3}, "jpg").storedFilename();
        Path path = storage.resolve(name).orElseThrow();
        assertThat(path).exists();

        storage.delete(name);

        assertThat(path).doesNotExist();
    }

    @Test
    void deleteIsIdempotentForUnknownNames() {
        MediaStorage storage = storage();
        assertThatNoException().isThrownBy(() ->
                storage.delete("0123456789abcdef0123456789abcdef.png"));
        assertThatNoException().isThrownBy(() -> storage.delete("../x.jpg"));
        assertThatNoException().isThrownBy(() -> storage.delete(null));
    }

    @Test
    void initCreatesAMissingDirectory() {
        Path root = tempDir.resolve("nested/deeper/media");
        MediaStorage storage = new MediaStorage(root);
        assertThat(root).doesNotExist();

        storage.init();

        assertThat(root).isDirectory();
    }

    @Test
    void initFailsClosedWhenTheDirectoryCannotBeCreated() throws Exception {
        // A regular file where the directory must go: createDirectories
        // cannot make the path, so the boot must fail with a clear message.
        Path blocker = tempDir.resolve("blocker");
        Files.writeString(blocker, "not a directory");
        MediaStorage storage = new MediaStorage(blocker.resolve("sub"));

        assertThatThrownBy(storage::init)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("media upload directory")
                .hasMessageContaining(blocker.resolve("sub").toString());
    }

    @Test
    void rootIsAbsoluteAndNormalized() {
        MediaStorage storage = new MediaStorage(tempDir.resolve("media/"));
        assertThat(storage.root()).isAbsolute();
        assertThat(storage.root()).isEqualByComparingTo(storage.root().normalize());
    }

    // ------------------------------------------------------------- derivatives

    @Test
    void storeDerivativeDerivesTheNameBesideTheOriginal() throws Exception {
        MediaStorage storage = storage();
        MediaStorage.StoredFile original = storage.store(new byte[]{1, 2, 3}, "png");
        byte[] derivativeBytes = new byte[]{9, 9};

        MediaStorage.StoredFile derivative =
                storage.storeDerivative(original.storedFilename(), 96, derivativeBytes);

        String stem = original.storedFilename().substring(0, 32);
        assertThat(derivative.storedFilename()).isEqualTo(stem + "-t96.png");
        assertThat(derivative.path()).exists();
        assertThat(Files.readAllBytes(derivative.path())).containsExactly(derivativeBytes);
        // The parent-equality gate applies to derivative names too.
        assertThat(storage.resolve(derivative.storedFilename()).orElseThrow().getParent())
                .isEqualTo(storage.root());
    }

    @Test
    void storeDerivativeKeepsTheBaseExtension() throws Exception {
        MediaStorage storage = storage();
        MediaStorage.StoredFile original = storage.store(new byte[]{1}, "jpg");

        String name = storage.storeDerivative(original.storedFilename(), 480, new byte[]{2}).storedFilename();

        assertThat(name).endsWith("-t480.jpg");
    }

    @Test
    void storeDerivativeRejectsAForeignBaseNameOrWidth() {
        MediaStorage storage = storage();
        String original = storage.store(new byte[]{1}, "jpg").storedFilename();
        for (String base : new String[]{"../x.png", original.toUpperCase(), null}) {
            assertThatThrownBy(() -> storage.storeDerivative(base, 96, new byte[]{1}))
                    .as("base: %s", (Object) base)
                    .isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(() -> storage.storeDerivative(original, 123, new byte[]{1}))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deleteWithDerivativesRemovesTheWholeSet() throws Exception {
        MediaStorage storage = storage();
        String name = storage.store(new byte[]{1}, "png").storedFilename();
        storage.storeDerivative(name, 96, new byte[]{2});
        storage.storeDerivative(name, 192, new byte[]{3});
        assertThat(Files.list(storage.root()).count()).isEqualTo(3);

        storage.deleteWithDerivatives(name);

        assertThat(Files.list(storage.root()).count()).isZero();
    }

    @Test
    void deleteWithDerivativesIsIdempotentForUnknownNames() {
        MediaStorage storage = storage();
        assertThatNoException().isThrownBy(() ->
                storage.deleteWithDerivatives("0123456789abcdef0123456789abcdef.png"));
        assertThatNoException().isThrownBy(() -> storage.deleteWithDerivatives(null));
    }

    @Test
    void derivativeWidthsPresentListsOnlyWhatExistsOnDisk() throws Exception {
        MediaStorage storage = storage();
        String name = storage.store(new byte[]{1}, "png").storedFilename();
        assertThat(storage.derivativeWidthsPresent(name)).isEmpty();

        storage.storeDerivative(name, 96, new byte[]{2});
        storage.storeDerivative(name, 480, new byte[]{3});

        assertThat(storage.derivativeWidthsPresent(name)).containsExactly(96, 480);
        // A name outside the contract has no derivative name space.
        assertThat(storage.derivativeWidthsPresent("../x.png")).isEmpty();
        assertThat(storage.derivativeWidthsPresent(null)).isEmpty();
    }
}
