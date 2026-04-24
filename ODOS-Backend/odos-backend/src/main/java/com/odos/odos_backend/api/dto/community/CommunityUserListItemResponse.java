package com.odos.odos_backend.api.dto.community;

import java.util.UUID;

public record CommunityUserListItemResponse(
    UUID id,
    String username,
    String fullName,
    String profilePhotoUrl,
    String city
) {
}
