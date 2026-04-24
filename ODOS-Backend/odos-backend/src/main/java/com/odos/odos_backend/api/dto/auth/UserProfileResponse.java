package com.odos.odos_backend.api.dto.auth;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserProfileResponse(
    UUID id,
    String email,
    String username,
    String fullName,
    String bio,
    String city,
    String profilePhotoUrl,
    String bannerPhotoUrl,
    String preferredLanguage,
    boolean isPublic,
    OffsetDateTime createdAt
) {
}
