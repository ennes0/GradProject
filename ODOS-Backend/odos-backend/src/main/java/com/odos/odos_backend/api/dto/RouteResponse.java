package com.odos.odos_backend.api.dto;

import java.util.List;

/**
 * GET /v1/route cevabı.
 * coordinates: düğüm polyline (WGS84).
 * segments: kenar sırasıyla geometri + eğim özeti (mobil renklendirme).
 * elevationProfile: (distKm, elevM).
 * avgSlopePct / maxSlopePct: rotadaki kenar eğimleri (|rise/run|·100, uzunluk ağırlıklı ort. ve tepe).
 * estimatedCaloriesKcal: varsayılan vücut ağırlığı ile kaba tahmin.
 * slopePolylineChunks: yükselti profili ile aynı kenar bloklarında |eğim| ortalaması + koordinat (harita renklendirme).
 * shapePoints: rota boyunca kümülatif mesafe (km) + koordinat; profil-harita eşlemesi ve navigasyon için.
 */
public record RouteResponse(
    List<double[]> coordinates,
    List<RouteSegmentDto> segments,
    double distanceKm,
    double durationMin,
    double totalClimbM,
    double totalDescentM,
    Double totalCost,
    List<ElevationProfilePoint> elevationProfile,
    Double startElevationM,
    Double endElevationM,
    double avgSlopePct,
    double maxSlopePct,
    double estimatedCaloriesKcal,
    List<SlopePolylineChunkDto> slopePolylineChunks,
    List<RouteShapePointDto> shapePoints,
    String error
) {
    public record ElevationProfilePoint(double distKm, double elevM) {}

    /**
     * Tek kenar: polyline (lat,lon), ortalama işaretli eğim (%), uzunluk (m), sınıf (flat|moderate|steep).
     */
    public record RouteSegmentDto(
        List<double[]> geometry,
        double meanGradePct,
        double lengthM,
        String slopeClass
    ) {}

    /**
     * Harita üzerinde eğim renklendirmesi: blok içi uzunluk ağırlıklı ortalama |eğim| (%).
     */
    public record SlopePolylineChunkDto(
        List<double[]> coordinates,
        double avgAbsSlopePct
    ) {}

    /**
     * Rota ekseni için doğrusal referans: kümülatif mesafe (km) + koordinat (lat/lon).
     */
    public record RouteShapePointDto(
        double distKm,
        double lat,
        double lon
    ) {}

    public static RouteResponse error(String message) {
        return new RouteResponse(
            List.of(), List.of(), 0, 0, 0, 0, null, List.of(), null, null, 0, 0, 0, List.of(), List.of(), message);
    }

    public static RouteResponse ok(
        List<double[]> coordinates,
        List<RouteSegmentDto> segments,
        double distanceKm,
        double durationMin,
        double totalClimbM,
        double totalDescentM,
        double totalCost,
        List<ElevationProfilePoint> elevationProfile,
        Double startElevationM,
        Double endElevationM,
        double avgSlopePct,
        double maxSlopePct,
        double estimatedCaloriesKcal,
        List<SlopePolylineChunkDto> slopePolylineChunks,
        List<RouteShapePointDto> shapePoints
    ) {
        return new RouteResponse(
            coordinates != null ? coordinates : List.of(),
            segments != null ? segments : List.of(),
            distanceKm, durationMin, totalClimbM, totalDescentM, totalCost,
            elevationProfile != null ? elevationProfile : List.of(),
            startElevationM, endElevationM,
            avgSlopePct, maxSlopePct, estimatedCaloriesKcal,
            slopePolylineChunks != null ? slopePolylineChunks : List.of(),
            shapePoints != null ? shapePoints : List.of(),
            null);
    }
}
