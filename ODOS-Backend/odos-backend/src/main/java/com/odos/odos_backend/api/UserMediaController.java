package com.odos.odos_backend.api;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.odos.odos_backend.media.UserMediaStorageService;

@RestController
public class UserMediaController {

    private final UserMediaStorageService userMediaStorageService;

    public UserMediaController(UserMediaStorageService userMediaStorageService) {
        this.userMediaStorageService = userMediaStorageService;
    }

    @GetMapping("/api/media/users/{userId}/{filename:.+}")
    public ResponseEntity<Resource> getUserMedia(
        @PathVariable UUID userId,
        @PathVariable String filename
    ) throws java.io.IOException {
        Path path = userMediaStorageService.resolveExistingFile(userId, filename);
        if (path == null) {
            return ResponseEntity.notFound().build();
        }
        String probe = Files.probeContentType(path);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
        if (probe != null) {
            try {
                mediaType = MediaType.parseMediaType(probe);
            } catch (Exception ignored) {
                mediaType = MediaType.APPLICATION_OCTET_STREAM;
            }
        }
        Resource body = new FileSystemResource(path);
        return ResponseEntity.ok()
            .contentType(mediaType)
            .header(HttpHeaders.CACHE_CONTROL, "public, max-age=86400")
            .body(body);
    }
}
