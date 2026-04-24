package com.odos.odos_backend.api.dto.community;

import java.time.OffsetDateTime;
import java.util.UUID;

public record FollowRequestItemResponse(
    UUID requestId,
    UUID followerId,
    String username,
    String fullName,
    String profilePhotoUrl,
    String city,
    OffsetDateTime createdAt
) {
}

