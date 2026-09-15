package ee.sheltermap.guidance;

import java.util.List;

/**
 * Deleting a media asset that is still the hero image of one or more
 * guidance posts, without {@code confirm=true} (crisis-guidance D8) —
 * 409. The message carries the affected posts (title + slug) so the admin
 * UI can turn the answer straight into the confirm dialog; the same call
 * with {@code confirm=true} deletes the asset and clears both
 * {@code hero_image_id} and {@code hero_image_alt} on every referencing
 * post in the same transaction.
 */
public class MediaAssetInUseException extends RuntimeException {

    private final List<String> affectedPosts;

    public MediaAssetInUseException(List<String> affectedPosts) {
        super("Media asset is used as the hero image of: " + String.join("; ", affectedPosts)
                + " — delete again with confirm=true to remove the image from those posts");
        this.affectedPosts = List.copyOf(affectedPosts);
    }

    /** The affected posts, each as {@code "<title>" (<slug>)}. */
    public List<String> affectedPosts() {
        return affectedPosts;
    }
}
