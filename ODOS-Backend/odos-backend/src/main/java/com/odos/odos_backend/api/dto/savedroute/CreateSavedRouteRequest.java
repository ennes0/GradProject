package com.odos.odos_backend.api.dto.savedroute;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * İstemcinin seans sonunda gönderdiği anlık görüntü. Sunucu rotayı yeniden hesaplamaz;
 * reroute sonrası bile kayıt, kullanıcının ekrandaki polyline ve metrikleriyle gelir.
 */
public record CreateSavedRouteRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 400) String startLabel,
    @Size(max = 400) String endLabel,
    @Size(max = 32) String routeType,
    @Size(max = 16) String difficulty,
    @NotBlank @Size(max = 32) String completionStatus,
    @NotNull @DecimalMin("0") @DecimalMax("1") Double completionRatio,
    Double plannedDistanceM,
    Double traveledDistanceM,
    @NotNull Integer elapsedSeconds,
    Double avgSpeedKmh,
    Double paceSecPerKm,
    Integer caloriesKcal,
    Integer climbM,
    Integer rerouteCount,
    Double maxOffRouteDistanceM,
    Double avgSlopePct,
    Double maxSlopePct,
    Double elevationGainM,
    Integer steps,
    @Size(max = 32) String mood,
    @Size(max = 120) String weatherSummary,
    @Size(max = 32) String temperatureLabel,
    @Size(max = 4000) String notes,
    @Size(max = 2000) String imageUrl,
    Boolean favorite,
    OffsetDateTime startedAt,
    @NotNull OffsetDateTime finishedAt,
    @Size(max = 8000) List<CoordDto> routePolyline,
    @Size(max = 2000) List<Double> elevationSeries,
    Map<String, Object> sessionExtras
) {
}
