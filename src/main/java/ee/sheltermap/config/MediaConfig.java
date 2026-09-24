package ee.sheltermap.config;

import ee.sheltermap.guidance.MediaStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;

/**
 * The media-storage wiring: the single
 * {@link MediaStorage} bean over the configured upload directory
 * ({@code app.media.upload-dir}, default {@code data/media}, env override
 * {@code MEDIA_UPLOAD_DIR}).
 *
 * <p>{@code init()} runs in the bean factory — the boot-time gate that
 * creates the directory when missing and FAILS THE BOOT with a clear
 * message when it cannot be created or is not writable (the fail-closed
 * habit of {@code PiiKeys} / {@code ProdJwtGuard}): a misconfigured
 * deployment is discovered at deploy time, not on the first upload.
 */
@Configuration
public class MediaConfig {

    @Bean
    public MediaStorage mediaStorage(@Value("${app.media.upload-dir:data/media}") String uploadDir) {
        MediaStorage storage = new MediaStorage(Path.of(uploadDir));
        storage.init();
        return storage;
    }
}
