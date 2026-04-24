package com.odos.odos_backend.media;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserMediaStorageService {

    private static final Pattern SAFE_FILENAME = Pattern.compile("^[a-zA-Z0-9._-]{1,200}$");
    private static final String WEB_PREFIX = "/api/media/users/";

    private final Path rootDir;

    public UserMediaStorageService(@Value("${odos.user-media.root:./data/user-media}") String root) {
        this.rootDir = Path.of(root).toAbsolutePath().normalize();
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
