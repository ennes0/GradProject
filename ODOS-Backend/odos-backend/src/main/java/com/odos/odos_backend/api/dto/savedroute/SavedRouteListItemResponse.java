package com.odos.odos_backend.api.dto.savedroute;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Liste ekranı: polyline / seri JSON olmadan hafif yanıt. */
public record SavedRouteListItemResponse(
    UUID id,
    String title,
    String startLabel,
    String endLabel,
    String routeType,
    String difficulty,
    String completionStatus,
    double completionRatio,
    Double plannedDistanceM,
    Double traveledDistanceM,
    int elapsedSeconds,
    Double avgSpeedKmh,
    Double paceSecPerKm,
    Integer caloriesKcal,
    Integer climbM,
    int rerouteCount,
    double maxOffRouteDistanceM,
    Double avgSlopePct,
    Double maxSlopePct,
    Double elevationGainM,
    Integer steps,
    String mood,
    String weatherSummary,
    String temperatureLabel,
    String notes,
    String imageUrl,
    boolean favorite,
    OffsetDateTime startedAt,
    OffsetDateTime finishedAt,
    OffsetDateTime createdAt
) {
}
