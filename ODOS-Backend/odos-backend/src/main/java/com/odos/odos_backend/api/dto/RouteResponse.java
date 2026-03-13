package com.odos.odos_backend.api.dto;

import java.util.List;

/**
 * GET /v1/route cevabı.
 * coordinates: [ [lat, lon], ... ] (WGS84) – tek polyline, junction duplicate yok.
 * segments: [ [ [lat,lon], ... ], ... ] – path sırasında kenar geometrileri; front segment bazlı çizebilir.
 * elevationProfile: (distKm, elevM) – elevM = mutlak rakım (m), başlangıç rakımı + segment net değişimi.
 * startElevationM / endElevationM: rota başı ve sonu rakım (m), profil ekseni için.
 */
public record RouteResponse(
    List<double[]> coordinates,
    List<List<double[]>> segments,
    double distanceKm,
    double durationMin,
    double totalClimbM,
    double totalDescentM,
    Double totalCost,
    List<ElevationProfilePoint> elevationProfile,
    Double startElevationM,
    Double endElevationM,
    String error
) {
    /** Yükselti profili noktası: mesafe (km), mutlak rakım (m). */
    public record ElevationProfilePoint(double distKm, double elevM) {}

    public static RouteResponse error(String message) {
        return new RouteResponse(List.of(), List.of(), 0, 0, 0, 0, null, List.of(), null, null, message);
    }

    public static RouteResponse ok(List<double[]> coordinates, List<List<double[]>> segments,
                                   double distanceKm, double durationMin,
                                   double totalClimbM, double totalDescentM, double totalCost,
                                   List<ElevationProfilePoint> elevationProfile,
                                   Double startElevationM, Double endElevationM) {
        return new RouteResponse(
            coordinates != null ? coordinates : List.of(),
            segments != null ? segments : List.of(),
            distanceKm, durationMin, totalClimbM, totalDescentM, totalCost,
            elevationProfile != null ? elevationProfile : List.of(),
            startElevationM, endElevationM,
            null);
    }
}
