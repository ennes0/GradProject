package com.odos.odos_backend.api.dto.community;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CommunityNotificationResponse(
    UUID id,
    String type,
    boolean isRead,
    OffsetDateTime createdAt,
    UUID actorId,
    String actorUsername,
    String actorFullName,
    String actorProfilePhotoUrl
) {
}

