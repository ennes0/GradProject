package com.odos.odos_backend.api.dto.community;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CommunityFeedItemResponse(
    UUID routeId,
    String title,
    String startLabel,
    String endLabel,
    String routeType,
    String difficulty,
    Double traveledDistanceM,
    Integer climbM,
    Integer caloriesKcal,
    OffsetDateTime finishedAt,
    UUID authorId,
    String authorUsername,
    String authorFullName,
    String authorProfilePhotoUrl
) {
}
