package ee.sheltermap.guidance;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * The thumbnail derivatives of a stored media asset (P2-9): the 40–72 px
 * slots (and the 400 px guidance card) used to download the FULL original
 * just to display a thumbnail. At upload/import time the original is
 * rendered down to a fixed width set, stored beside the original under a
 * derived generated name, and the serving URL shape is extended so the
 * slots can offer them as a {@code srcset}.
 *
 * <p><b>Format policy — same format as the original.</b> The JDK's
 * {@code ImageIO} reads and writes JPEG and PNG but has NO WebP
 * reader/encoder (the inspector's documented constraint), so a WebP
 * original gets NO derivative: its slots render the original via plain
 * {@code src} (the srcset is built from what EXISTS on disk — an asset
 * without derivatives simply has none). No runtime dependency is added
 * to change that.
 *
 * <p><b>The guards are extended, not replaced.</b> The derivative bytes go
 * through the SAME {@link MediaImageInspector} magic-byte gate as the
 * upload (see {@link #passesGate}) — only bytes the inspector re-reads
 * as the expected type at the expected width ever reach disk — and the
 * decode of the original is bounded by the caller's per-side pixel cap
 * (the upload path's {@code app.media.derivative-max-side}, the import
 * path's guard 7 {@code app.media.import-max-side}) so an unbounded
 * header can never drive an unbounded bitmap decode. The upstream guards
 * (the streaming size cap, the per-hop redirect re-validation) run before
 * this class sees any bytes and are untouched.
 *
 * <p><b>No upscale, ever.</b> A derivative is only rendered when the
 * target width is strictly BELOW the original's width — a 100 px asset
 * must not be "improved" into a 96 px asset, and a small asset simply
 * has no derivatives (its slots already show it at native size).
 */
public final class MediaDerivatives {

    /**
     * The derivative width set (ascending), covering every thumbnail slot
     * up to 2× device pixel ratio: 96 serves the 40–72 px slots at 1×,
     * 192 the same at 2×, 480 the 400 px guidance card at 1× and 800 the
     * card at 2×.
     */
    public static final int[] WIDTHS = {96, 192, 480, 800};

    /** The generated ORIGINAL name (the derivative's base — P2-9). */
    public static final Pattern BASE_NAME = Pattern.compile("^[a-f0-9]{32}\\.(jpg|png|webp)$");

    /** The JPEG quality for the rendered derivatives (small formats, 0.85). */
    private static final float JPEG_QUALITY = 0.85f;

    private MediaDerivatives() {
    }

    /** A rendered derivative: its target width and the (ungated) encoded bytes. */
    public record RenderedDerivative(int width, byte[] bytes) {
    }

    /**
     * Whether the format can be rendered at all: the JDK reads/writes
     * JPEG and PNG only (no WebP — see the class javadoc).
     */
    public static boolean isRenderable(String contentType) {
        if (contentType == null) {
            return false;
        }
        return contentType.equalsIgnoreCase("image/jpeg") || contentType.equalsIgnoreCase("image/png");
    }

    /**
     * The derivative name beside the original:
     * {@code <32 hex>-t<width>.<same extension>}. The name is computed
     * from a base that must ALREADY satisfy the serving contract
     * (32 hex + sniffed extension) — a base that does not is refused
     * outright, so the derivative can never carry a foreign shape into
     * the upload directory.
     *
     * @throws IllegalArgumentException a base outside the contract, or a
     *                                  width outside {@link #WIDTHS}
     */
    public static String derivativeName(String storedFilename, int width) {
        if (storedFilename == null || !BASE_NAME.matcher(storedFilename).matches()) {
            throw new IllegalArgumentException("Not a stored media filename: " + storedFilename);
        }
        if (Arrays.binarySearch(WIDTHS, width) < 0) {
            throw new IllegalArgumentException("Not a derivative width: " + width
                    + " (expected one of " + Arrays.toString(WIDTHS) + ")");
        }
        int dot = storedFilename.lastIndexOf('.');
        return storedFilename.substring(0, dot) + "-t" + width + storedFilename.substring(dot);
    }

    /**
     * Render every derivative the original can serve: the renderable
     * formats only, strictly below the original's width (no upscale),
     * the decode bounded by the CALLER's per-side pixel cap (checked
     * before this is called — this class owns the rendering, the caller
     * owns the cap).
     *
     * @param bestEffort {@code true} (the upload path): a rendered
     *                   derivative that fails the content gate is
     *                   SKIPPED; {@code false} (the import path): it
     *                   throws {@link UnsupportedImageException} — the
     *                   P2-9 acceptance rule, the import fails and the
     *                   post stays a DRAFT (the existing behaviour)
     * @return the rendered derivatives in ascending width order — empty
     *         for a WebP original, a too-small original, or an
     *         undecodable body (the decode failure is a property of the
     *         whole image, so one failed decode means no width succeeds)
     */
    public static List<RenderedDerivative> renderAll(String contentType,
                                                     int sourceWidth,
                                                     int sourceHeight,
                                                     byte[] bytes,
                                                     boolean bestEffort) {
        if (!isRenderable(contentType) || sourceWidth <= 0 || sourceHeight <= 0 || bytes == null) {
            return List.of();
        }
        Optional<BufferedImage> decoded = decode(bytes);
        if (decoded.isEmpty()) {
            return List.of(); // undecodable — no width can succeed
        }
        List<RenderedDerivative> rendered = new ArrayList<>();
        for (int width : WIDTHS) {
            if (width >= sourceWidth) {
                continue; // never an upscale
            }
            int targetHeight = Math.max(1, Math.round(sourceHeight * (float) width / sourceWidth));
            byte[] out = encode(contentType, stagedDownscale(decoded.get(), width, targetHeight),
                    width, targetHeight);
            if (out == null) {
                continue; // the encoder refused — skip this width
            }
            if (!passesGate(out, contentType, width)) {
                if (!bestEffort) {
                    throw new UnsupportedImageException("A generated thumbnail failed the content "
                            + "gate (expected a readable " + contentType + " at " + width
                            + " px — the encoder output was not a readable image)");
                }
                continue; // best effort: skip the width, keep the original
            }
            rendered.add(new RenderedDerivative(width, out));
        }
        return rendered;
    }

    /**
     * THE content gate for derivative bytes — the same
     * {@link MediaImageInspector} the upload applies to the original:
     * the rendered bytes must re-inspect as the expected type at the
     * expected width. The inspector reads the HEADER, so this also
     * catches a truncated write (an unreadable header answers empty).
     */
    public static boolean passesGate(byte[] rendered, String expectedContentType, int expectedWidth) {
        if (rendered == null || expectedWidth <= 0) {
            return false;
        }
        return MediaImageInspector.inspect(rendered)
                .filter(info -> info.contentType().equalsIgnoreCase(expectedContentType))
                .filter(info -> info.width() == expectedWidth)
                .isPresent();
    }

    // ---- render -----------------------------------------------------------

    /** Decode the body into a raster — empty when the JDK cannot read it. */
    private static Optional<BufferedImage> decode(byte[] bytes) {
        try {
            BufferedImage image = ImageIO.read(new ByteArrayInputStream(bytes));
            return image == null ? Optional.empty() : Optional.of(image);
        } catch (IOException | UncheckedIOException ex) {
            return Optional.empty();
        }
    }

    /**
     * The staged downscale: halve until within 2× of the target, then
     * one final bicubic pass at the exact target — the single-pass
     * aliasing of a 4000→96 resample is what this exists to avoid.
     */
    private static BufferedImage stagedDownscale(BufferedImage source, int targetWidth, int targetHeight) {
        boolean alpha = source.getColorModel().hasAlpha();
        int w = source.getWidth();
        int h = source.getHeight();
        BufferedImage current = source;
        while (w / 2 >= targetWidth && h / 2 >= targetHeight) {
            w = Math.max(targetWidth, w / 2);
            h = Math.max(targetHeight, h / 2);
            current = resample(current, w, h, alpha);
        }
        if (w != targetWidth || h != targetHeight) {
            current = resample(current, targetWidth, targetHeight, alpha);
        }
        return current;
    }

    private static BufferedImage resample(BufferedImage source, int width, int height, boolean alpha) {
        BufferedImage out = new BufferedImage(width, height,
                alpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        Graphics2D g = out.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.drawImage(source, 0, 0, width, height, null);
        } finally {
            g.dispose();
        }
        return out;
    }

    /** Encode at the target; null when the JDK cannot write the format. */
    private static byte[] encode(String contentType, BufferedImage image, int width, int height) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (contentType.equalsIgnoreCase("image/jpeg")) {
                // The JPEG writer needs an explicit quality (the default
                // is ~0.75 — 0.85 keeps the small thumbnails clean).
                ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
                try {
                    ImageWriteParam param = writer.getDefaultWriteParam();
                    if (param.canWriteCompressed()) {
                        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                        param.setCompressionQuality(JPEG_QUALITY);
                    }
                    try (ImageOutputStream ios = ImageIO.createImageOutputStream(out)) {
                        writer.setOutput(ios);
                        writer.write(null, new IIOImage(image, null, null), param);
                    }
                } finally {
                    writer.dispose();
                }
            } else if (!ImageIO.write(image, "png", out)) {
                return null; // no PNG writer on this JDK
            }
            return out.toByteArray();
        } catch (IOException | UncheckedIOException ex) {
            return null;
        }
    }
}
