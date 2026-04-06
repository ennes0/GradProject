package com.odos.odos_backend.api.dto;

import java.util.List;

/**
 * GET /v1/routes cevabı: 3 rota önerisi (shortest, balanced, easiest).
 */
public record RoutesResponse(
    List<RouteVariantDto> routes,
    String error
) {
    public record RouteVariantDto(
        String type,
        String label,
        List<double[]> coordinates,
        double distanceKm,
        double durationMin,
        double totalClimbM,
        double totalDescentM,
        List<RouteResponse.ElevationProfilePoint> elevationProfile,
        Double startElevationM,
        Double endElevationM,
        List<RouteResponse.RouteSegmentDto> segments,
        double avgSlopePct,
        double maxSlopePct,
        double estimatedCaloriesKcal,
        List<RouteResponse.SlopePolylineChunkDto> slopePolylineChunks,
        List<RouteResponse.RouteShapePointDto> shapePoints
    ) {}

    public static RoutesResponse error(String message) {
        return new RoutesResponse(List.of(), message);
    }

    public static RoutesResponse ok(List<RouteVariantDto> routes) {
        return new RoutesResponse(routes != null ? routes : List.of(), null);
    }
}
