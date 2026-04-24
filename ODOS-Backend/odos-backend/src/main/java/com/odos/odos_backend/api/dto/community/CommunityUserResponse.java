package com.odos.odos_backend.api.dto.community;

import java.util.UUID;

public record CommunityUserResponse(
    UUID id,
    String username,
    String fullName,
    String city,
    String bio,
    String profilePhotoUrl,
    long routesShared,
    long followers,
    long followingCount,
    boolean following,
    boolean requested
) {
}
