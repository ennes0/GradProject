package com.odos.odos_backend.api.dto.community;

import java.util.UUID;

public record PublicUserProfileResponse(
    UUID id,
    String username,
    String fullName,
    String bio,
    String city,
    String profilePhotoUrl,
    String bannerPhotoUrl,
    boolean isPublic,
    long routesShared,
    long followers,
    long followingCount,
    boolean viewerFollows,
    boolean viewerRequested,
    boolean viewerIsSelf,
    boolean profileHidden
) {
}
