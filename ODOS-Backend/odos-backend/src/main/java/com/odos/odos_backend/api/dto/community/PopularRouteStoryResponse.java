package com.odos.odos_backend.api.dto.community;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PopularRouteStoryResponse(
    UUID routeId,
    String routeName,
    String startLabel,
    String endLabel,
    String difficulty,
    Double traveledDistanceM,
    Integer elapsedSeconds,
    Double avgSlopePct,
    Double elevationGainM,
    Integer caloriesKcal,
    OffsetDateTime finishedAt,
    String imageUrl,
    UUID authorId,
    String authorUsername,
    String authorFullName,
    String authorCity,
    String authorProfilePhotoUrl
) {
}