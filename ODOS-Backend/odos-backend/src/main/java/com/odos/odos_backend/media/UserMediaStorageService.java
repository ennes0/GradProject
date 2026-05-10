package com.odos.odos_backend.media;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Service
public class UserMediaStorageService {

    private static final Pattern SAFE_FILENAME = Pattern.compile("^[a-zA-Z0-9._-]{1,200}$");
    private static final String WEB_PREFIX = "/api/media/users/";

    private final Path rootDir;
    private final boolean s3Enabled;
    private final String s3Bucket;
    private final String s3Region;
    private final String s3Prefix;
    private final String s3PublicBaseUrl;
    private final S3Client s3Client;

    public UserMediaStorageService(
        @Value("${odos.user-media.root:./data/user-media}") String root,
        @Value("${odos.user-media.s3-enabled:false}") boolean s3Enabled,
        @Value("${odos.user-media.s3-bucket:}") String s3Bucket,
        @Value("${odos.user-media.s3-region:}") String s3Region,
        @Value("${odos.user-media.s3-prefix:users}") String s3Prefix,
        @Value("${odos.user-media.s3-public-base-url:}") String s3PublicBaseUrl
    ) {
        this.rootDir = Path.of(root).toAbsolutePath().normalize();
        this.s3Enabled = s3Enabled;
        this.s3Bucket = s3Bucket == null ? "" : s3Bucket.trim();
        this.s3Region = s3Region == null ? "" : s3Region.trim();
        this.s3Prefix = normalizePrefix(s3Prefix);
        this.s3PublicBaseUrl = normalizePublicBaseUrl(s3PublicBaseUrl);

        if (this.s3Enabled) {
            if (!StringUtils.hasText(this.s3Bucket) || !StringUtils.hasText(this.s3Region)) {
                throw new IllegalStateException("S3 etkin ama bucket/region eksik");
            }
            this.s3Client = S3Client.builder()
                .region(Region.of(this.s3Region))
                .build();
        } else {
            this.s3Client = null;
        }
    }

    public Path getRootDir() {
        return rootDir;
    }

    /**
     * Saves bytes under {@code rootDir/<userId>/<random>.<ext>} and returns the web path stored in DB
     * (always starts with {@value #WEB_PREFIX}).
     */
    public String saveUserImage(UUID userId, MultipartFile file) throws IOException {
        validateImage(file);
        String filename = uniqueFilename(file);
        if (s3Enabled) {
            String key = toS3Key(userId, filename);
            PutObjectRequest req = PutObjectRequest.builder()
                .bucket(s3Bucket)
                .key(key)
                .contentType(file.getContentType())
                .cacheControl("public, max-age=31536000")
                .build();
            s3Client.putObject(req, RequestBody.fromBytes(file.getBytes()));
            return toS3PublicUrl(key);
        }
        Path userDir = rootDir.resolve(userId.toString()).normalize();
        if (!userDir.startsWith(rootDir)) {
            throw new IllegalStateException("Geçersiz depolama yolu");
        }
        Files.createDirectories(userDir);
        Path target = userDir.resolve(filename).normalize();
        if (!target.startsWith(userDir)) {
            throw new IllegalStateException("Geçersiz dosya yolu");
        }
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }
        return webPath(userId, filename);
    }

    public Path resolveExistingFile(UUID userId, String filename) {
        if (s3Enabled) {
            return null;
        }
        if (!SAFE_FILENAME.matcher(filename).matches()) {
            return null;
        }
        Path userDir = rootDir.resolve(userId.toString()).normalize();
        if (!userDir.startsWith(rootDir)) {
            return null;
        }
        Path target = userDir.resolve(filename).normalize();
        if (!target.startsWith(userDir)) {
            return null;
        }
        return Files.isRegularFile(target) ? target : null;
    }

    /**
     * Deletes a previously stored file if {@code stored} points at our own media tree for this user.
     */
    public void deleteIfOwnedByUser(String stored, UUID userId) {
        if (!StringUtils.hasText(stored)) {
            return;
        }
        if (s3Enabled) {
            deleteFromS3IfOwned(stored, userId);
            return;
        }
        String path = stripPotentialOrigin(stored.trim());
        String expectedPrefix = WEB_PREFIX + userId + "/";
        if (!path.startsWith(expectedPrefix)) {
            return;
        }
        String filename = path.substring(expectedPrefix.length());
        if (!SAFE_FILENAME.matcher(filename).matches()) {
            return;
        }
        Path userDir = rootDir.resolve(userId.toString()).normalize();
        if (!userDir.startsWith(rootDir)) {
            return;
        }
        Path target = userDir.resolve(filename).normalize();
        if (!target.startsWith(userDir)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException ignored) {
            // best-effort cleanup
        }
    }

    private static void validateImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Görsel dosyası boş");
        }
        String ct = file.getContentType();
        if (ct == null) {
            throw new IllegalArgumentException("Geçersiz görsel türü");
        }
        String lower = ct.toLowerCase();
        if (!(lower.startsWith("image/jpeg") || lower.startsWith("image/jpg")
            || lower.startsWith("image/png") || lower.startsWith("image/webp"))) {
            throw new IllegalArgumentException("Sadece JPEG, PNG veya WebP yükleyebilirsiniz");
        }
        long max = 5 * 1024 * 1024;
        if (file.getSize() > max) {
            throw new IllegalArgumentException("Görsel en fazla 5 MB olabilir");
        }
    }

    private static String uniqueFilename(MultipartFile file) {
        String ct = file.getContentType();
        String ext = ".jpg";
        if (ct != null) {
            String l = ct.toLowerCase();
            if (l.contains("png")) {
                ext = ".png";
            } else if (l.contains("webp")) {
                ext = ".webp";
            }
        }
        return UUID.randomUUID() + ext;
    }

    private static String webPath(UUID userId, String filename) {
        return WEB_PREFIX + userId + "/" + filename;
    }

    private String toS3Key(UUID userId, String filename) {
        return s3Prefix + "/" + userId + "/" + filename;
    }

    private String toS3PublicUrl(String key) {
        if (StringUtils.hasText(s3PublicBaseUrl)) {
            return s3PublicBaseUrl + "/" + key;
        }
        return "https://" + s3Bucket + ".s3." + s3Region + ".amazonaws.com/" + key;
    }

    private void deleteFromS3IfOwned(String stored, UUID userId) {
        String key = extractOwnedS3Key(stored, userId);
        if (!StringUtils.hasText(key)) {
            return;
        }
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder().bucket(s3Bucket).key(key).build());
        } catch (Exception ignored) {
            // best-effort cleanup
        }
    }

    private String extractOwnedS3Key(String stored, UUID userId) {
        String trimmed = stored.trim();
        String userToken = "/" + userId + "/";
        String expectedPrefix = s3Prefix + "/" + userId + "/";

        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            try {
                URI uri = new URI(trimmed);
                String path = uri.getPath();
                if (path == null) {
                    return null;
                }
                String key = path.startsWith("/") ? path.substring(1) : path;
                if (key.startsWith(expectedPrefix)) {
                    return key;
                }
                if (key.contains(userToken) && key.startsWith(s3Prefix + "/")) {
                    return key;
                }
                return null;
            } catch (URISyntaxException ignored) {
                return null;
            }
        }

        String candidate = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
        if (candidate.startsWith(expectedPrefix)) {
            return candidate;
        }
        return null;
    }

    private static String normalizePrefix(String rawPrefix) {
        String p = rawPrefix == null ? "" : rawPrefix.trim();
        if (p.isEmpty()) {
            p = "users";
        }
        while (p.startsWith("/")) {
            p = p.substring(1);
        }
        while (p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        return p.toLowerCase(Locale.ROOT);
    }

    private static String normalizePublicBaseUrl(String raw) {
        if (!StringUtils.hasText(raw)) {
            return "";
        }
        String out = raw.trim();
        while (out.endsWith("/")) {
            out = out.substring(0, out.length() - 1);
        }
        return out;
    }

    /**
     * Strips optional origin so we can match both relative {@code /api/media/...} and absolute URLs.
     */
    private static String stripPotentialOrigin(String stored) {
        int idx = stored.indexOf(WEB_PREFIX);
        if (idx >= 0) {
            return stored.substring(idx);
        }
        return stored;
    }
}
