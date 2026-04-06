package com.odos.odos_backend.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.function.ToDoubleFunction;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.odos.odos_backend.api.dto.RouteResponse;
import com.odos.odos_backend.api.dto.RoutesResponse;
import com.odos.odos_backend.graph.GraphLoader;
import com.odos.odos_backend.graph.InMemoryGraph;
import com.odos.odos_backend.graph.NodeSpatialIndex;

/**
 * Rota hesaplama: en yakın düğüm snap (Haversine, m) + A* (heuristic: hedefe kuş uçuşu mesafe).
 * Üç seçenek: En Kısa (kenar uzunluğu toplamı), Dengeli (Tobler + tırmanış cezası), En Kolay (eğim cezası).
 */
@Service
public class RouteService {

    private static final Logger log = LoggerFactory.getLogger(RouteService.class);

    /**
     * Python {@code yol_egim_bagla7.py} ile aynı: {@code TOBLER_V_REF_KMH = 6.0}.
     * {@code COST_MODE = "relative"} iken kenar maliyeti: {@code seg_len * (v_ref / speed)} (metre cinsinden Tobler eşdeğeri).
     */
    private static final double TOBLER_V_REF_KMH = 6.0;
    /**
     * Yükselti profili örneklemesi ve blok bazlı net delta (ascent−descent) için aynı kenar sayısı.
     * Eğim renkli polyline parçaları da aynı blok boyunu kullanır ({@link #buildSlopePolylineChunks}).
     */
    private static final int ELEVATION_SEGMENT_EDGES = 7;
    /** Dengeli: Tobler maliyetine eklenen tırmanış cezası (1 m tırmanış ≈ bu kadar metre). */
    private static final double BALANCED_ASCENT_PENALTY = 18.0;
    /** En kolay: eğim değişimini min (1 m çıkış+iniş ≈ bu kadar metre); düz yol deneyimi. */
    private static final double EASIEST_ELEVATION_CHANGE_PENALTY = 40.0;

    /** Kalori tahmini için varsayılan vücut ağırlığı (kg); ileride kullanıcı profiline bağlanabilir. */
    private static final double DEFAULT_BODY_WEIGHT_KG = 70.0;
    private static final double KCAL_PER_KM_KG = 0.55;
    private static final double KCAL_PER_M_CLIMB_KG = 0.006;

    public enum RouteType {
        /** Kenar {@code length} toplamını minimize eder (saf graf mesafesi). */
        SHORTEST,
        BALANCED,  // Tobler + ılımlı tırmanış cezası
        EASIEST    // mesafe + yüksek ceza*(ascent+descent) – en düz rota
    }

    private final GraphLoader graphLoader;

    public RouteService(GraphLoader graphLoader) {
        this.graphLoader = graphLoader;
    }

    /**
     * origin → dest arası rota (lat/lon WGS84).
     */
    public RouteResponse findRoute(double originLat, double originLon, double destLat, double destLon) {
        InMemoryGraph graph = graphLoader.getGraph();
        if (graph == null || graph.nodeCount() == 0) {
            return RouteResponse.error("Graf yüklenmedi");
        }

        Long startNode = nearestNode(graph, originLat, originLon);
        Long endNode = nearestNode(graph, destLat, destLon);
        if (startNode == null || endNode == null) {
            return RouteResponse.error("Başlangıç veya bitiş noktası için düğüm bulunamadı");
        }
        if (startNode.equals(endNode)) {
            List<double[]> coords = List.of(
                new double[] { originLat, originLon },
                new double[] { destLat, destLon }
            );
            InMemoryGraph.NodeRecord n = graph.getNodes().get(startNode);
            double rakim = n != null ? n.rakim() : 0;
            return RouteResponse.ok(
                coords, List.of(), 0, 0, 0, 0, 0,
                List.of(new RouteResponse.ElevationProfilePoint(0, rakim)), rakim, rakim,
                0, 0, 0, List.of(), List.of(
                    new RouteResponse.RouteShapePointDto(0, originLat, originLon),
                    new RouteResponse.RouteShapePointDto(0, destLat, destLon)
                ));
        }

        DijkstraResult result = astar(graph, startNode, endNode, RouteType.SHORTEST);
        if (result.path.isEmpty()) {
            return RouteResponse.error("Rota bulunamadı");
        }

        // Path node'larından koordinat listesi.
        List<double[]> coordinates = buildCoordinatesFromPathNodes(graph, result.path);
        ElevationProfileAndClimb elev = buildElevationProfileAndClimbDescent(graph, result.path);
        double totalLength = elev.totalLengthM();
        double totalClimb = elev.climbDescent().climbM();
        double totalDescent = elev.climbDescent().descentM();
        double durationMin = minutesFromToblerRelativeCost(elev.toblerCostSum());
        PathSegmentMetrics segM = buildPathSegmentMetrics(graph, result.path, totalLength / 1000.0, totalClimb);
        List<RouteResponse.SlopePolylineChunkDto> slopeChunks = buildSlopePolylineChunks(graph, result.path);
        List<RouteResponse.RouteShapePointDto> shapePoints = buildRouteShapePoints(graph, result.path);

        log.info("[ROUTE] net climb={}m net descent={}m (per-block ascent−descent, {} edges/block)", totalClimb, totalDescent, ELEVATION_SEGMENT_EDGES);

        List<RouteResponse.ElevationProfilePoint> elevationProfile = elev.profile();
        Double startElevM = null;
        Double endElevM = null;
        InMemoryGraph.NodeRecord firstNode = graph.getNodes().get(result.path.get(0));
        InMemoryGraph.NodeRecord lastNode = graph.getNodes().get(result.path.get(result.path.size() - 1));
        if (firstNode != null) startElevM = firstNode.rakim();
        if (lastNode != null) endElevM = lastNode.rakim();

        return RouteResponse.ok(
            coordinates, segM.segments(), totalLength / 1000.0, durationMin, totalClimb, totalDescent, result.totalCost(),
            elevationProfile, startElevM, endElevM,
            segM.avgSlopePct(), segM.maxSlopePct(), segM.estimatedCaloriesKcal(), slopeChunks, shapePoints);
    }

    /**
     * 3 rota önerisi: En Kısa (saf uzunluk), Dengeli (Tobler + ascent cezası), En Kolay (eğim cezası).
     */
    public RoutesResponse findRoutes(double originLat, double originLon, double destLat, double destLon) {
        InMemoryGraph graph = graphLoader.getGraph();
        if (graph == null || graph.nodeCount() == 0) {
            return RoutesResponse.error("Graf yüklenmedi");
        }
        Long startNode = nearestNode(graph, originLat, originLon);
        Long endNode = nearestNode(graph, destLat, destLon);
        if (startNode == null || endNode == null) {
            return RoutesResponse.error("Başlangıç veya bitiş noktası için düğüm bulunamadı");
        }
        if (startNode.equals(endNode)) {
            List<double[]> coords = List.of(
                new double[] { originLat, originLon },
                new double[] { destLat, destLon }
            );
            double rakim = 0;
            InMemoryGraph.NodeRecord n = graph.getNodes().get(startNode);
            if (n != null) rakim = n.rakim();
            RoutesResponse.RouteVariantDto single = new RoutesResponse.RouteVariantDto(
                "shortest", "En Kısa", coords, 0, 0, 0, 0,
                List.of(new RouteResponse.ElevationProfilePoint(0, rakim)), rakim, rakim,
                List.of(), 0, 0, 0, List.of(), List.of(
                    new RouteResponse.RouteShapePointDto(0, originLat, originLon),
                    new RouteResponse.RouteShapePointDto(0, destLat, destLon)
                ));
            return RoutesResponse.ok(List.of(single));
        }

        List<RoutesResponse.RouteVariantDto> list = new ArrayList<>();
        for (RouteType type : new RouteType[] { RouteType.SHORTEST, RouteType.BALANCED, RouteType.EASIEST }) {
            DijkstraResult result = astar(graph, startNode, endNode, type);
            if (result.path.isEmpty()) continue;
            RoutesResponse.RouteVariantDto dto = buildVariantDto(graph, result.path, type);
            if (dto != null) list.add(dto);
        }
        if (list.isEmpty()) {
            return RoutesResponse.error("Rota bulunamadı");
        }
        return RoutesResponse.ok(list);
    }

    private RoutesResponse.RouteVariantDto buildVariantDto(InMemoryGraph graph, List<Long> path, RouteType type) {
        List<double[]> coordinates = buildCoordinatesFromPathNodes(graph, path);
        ElevationProfileAndClimb elev = buildElevationProfileAndClimbDescent(graph, path);
        // Yürüyüş süresi: yalnızca Tobler kenar maliyetlerinden (optimizasyon cezası süreyi şişirmez).
        double durationMin = minutesFromToblerRelativeCost(elev.toblerCostSum());
        double totalClimb = elev.climbDescent().climbM();
        double totalDescent = elev.climbDescent().descentM();
        List<RouteResponse.ElevationProfilePoint> elevationProfile = elev.profile();
        InMemoryGraph.NodeRecord first = graph.getNodes().get(path.get(0));
        InMemoryGraph.NodeRecord last = graph.getNodes().get(path.get(path.size() - 1));
        Double startElevM = first != null ? first.rakim() : null;
        Double endElevM = last != null ? last.rakim() : null;

        String typeStr = type.name().toLowerCase(Locale.ROOT);
        String label = type == RouteType.SHORTEST ? "En Kısa" : type == RouteType.BALANCED ? "Dengeli" : "En Kolay";
        PathSegmentMetrics segM = buildPathSegmentMetrics(graph, path, elev.totalLengthM() / 1000.0, totalClimb);
        List<RouteResponse.SlopePolylineChunkDto> slopeChunks = buildSlopePolylineChunks(graph, path);
        List<RouteResponse.RouteShapePointDto> shapePoints = buildRouteShapePoints(graph, path);
        return new RoutesResponse.RouteVariantDto(
            typeStr, label, coordinates,
            elev.totalLengthM() / 1000.0, durationMin, totalClimb, totalDescent,
            elevationProfile, startElevM, endElevM,
            segM.segments(), segM.avgSlopePct(), segM.maxSlopePct(), segM.estimatedCaloriesKcal(), slopeChunks, shapePoints);
    }

    /**
     * Kenar sırasıyla geometri + eğim; ortalama/ max |eğim| (%), kaba kalori (kg varsayılan).
     */
    private PathSegmentMetrics buildPathSegmentMetrics(InMemoryGraph graph, List<Long> path, double distanceKm, double totalClimbM) {
        List<RouteResponse.RouteSegmentDto> segmentDtos = new ArrayList<>();
        double weightedAbsGradePct = 0;
        double pathLenM = 0;
        double maxAbsGradePct = 0;
        for (int i = 0; i < path.size() - 1; i++) {
            long u = path.get(i);
            long v = path.get(i + 1);
            InMemoryGraph.EdgeRecord e = getEdge(graph, u, v);
            if (e == null) {
                continue;
            }
            double len = e.lengthM();
            pathLenM += len;
            double signedRatio = e.meanGradeSignedRatio();
            double absPct = Math.abs(signedRatio) * 100.0;
            weightedAbsGradePct += absPct * len;
            maxAbsGradePct = Math.max(maxAbsGradePct, absPct);
            List<double[]> geom = graph.getEdgeGeometry(u, v);
            if (geom == null || geom.isEmpty()) {
                geom = fallbackEdgePolyline(graph, u, v);
            }
            double meanGradePct = signedRatio * 100.0;
            String slopeClass = slopeClassFromAbsRatio(Math.abs(signedRatio));
            segmentDtos.add(new RouteResponse.RouteSegmentDto(geom, meanGradePct, len, slopeClass));
        }
        double avgSlopePct = pathLenM > 0 ? weightedAbsGradePct / pathLenM : 0;
        double kcal = estimateWalkingCaloriesKcal(DEFAULT_BODY_WEIGHT_KG, distanceKm, totalClimbM);
        return new PathSegmentMetrics(segmentDtos, avgSlopePct, maxAbsGradePct, kcal);
    }

    /**
     * Yükselti profili ile aynı kenar bloklarında ( {@link #ELEVATION_SEGMENT_EDGES} ) uzunluk ağırlıklı ortalama |eğim| (%)
     * ve birleştirilmiş polyline; düğüm rakımına göre örnekleme yok.
     */
    private List<RouteResponse.SlopePolylineChunkDto> buildSlopePolylineChunks(InMemoryGraph graph, List<Long> path) {
        int numEdges = path.size() - 1;
        if (numEdges <= 0) {
            return List.of();
        }
        List<RouteResponse.SlopePolylineChunkDto> out = new ArrayList<>();
        for (int segStart = 0; segStart < numEdges; ) {
            int segEnd = Math.min(segStart + ELEVATION_SEGMENT_EDGES, numEdges);
            double segLenM = 0;
            double weightedAbsPct = 0;
            List<double[]> chunkCoords = new ArrayList<>();
            for (int i = segStart; i < segEnd; i++) {
                long u = path.get(i);
                long v = path.get(i + 1);
                InMemoryGraph.EdgeRecord e = getEdge(graph, u, v);
                List<double[]> geom = graph.getEdgeGeometry(u, v);
                if (geom == null || geom.isEmpty()) {
                    geom = fallbackEdgePolyline(graph, u, v);
                }
                if (e != null) {
                    double len = e.lengthM();
                    double absPct = Math.abs(e.meanGradeSignedRatio()) * 100.0;
                    segLenM += len;
                    weightedAbsPct += absPct * len;
                }
                appendPolylinePoints(chunkCoords, geom, i > segStart);
            }
            double avgAbs = segLenM > 0 ? weightedAbsPct / segLenM : 0;
            if (chunkCoords.size() >= 2) {
                out.add(new RouteResponse.SlopePolylineChunkDto(chunkCoords, avgAbs));
            }
            segStart = segEnd;
        }
        return out;
    }

    /**
     * Rota üzerindeki kümülatif mesafe ekseni için shape points üretir.
     * Mesafe, graph kenar uzunluklarına göre ilerler; geometri içindeki alt parçalar bu uzunluğa orantılı dağıtılır.
     */
    private List<RouteResponse.RouteShapePointDto> buildRouteShapePoints(InMemoryGraph graph, List<Long> path) {
        int numEdges = path.size() - 1;
        if (numEdges <= 0) {
            return List.of();
        }
        List<RouteResponse.RouteShapePointDto> out = new ArrayList<>();
        double cumulM = 0;
        for (int i = 0; i < numEdges; i++) {
            long u = path.get(i);
            long v = path.get(i + 1);
            InMemoryGraph.EdgeRecord e = getEdge(graph, u, v);
            if (e == null) continue;
            List<double[]> geom = graph.getEdgeGeometry(u, v);
            if (geom == null || geom.isEmpty()) {
                geom = fallbackEdgePolyline(graph, u, v);
            }
            if (geom.isEmpty()) continue;

            if (out.isEmpty()) {
                double[] first = geom.get(0);
                out.add(new RouteResponse.RouteShapePointDto(0, first[0], first[1]));
            }
            if (geom.size() < 2 || e.lengthM() <= 0) {
                double[] last = geom.get(geom.size() - 1);
                cumulM += Math.max(0, e.lengthM());
                out.add(new RouteResponse.RouteShapePointDto(cumulM / 1000.0, last[0], last[1]));
                continue;
            }

            double rawGeomLen = 0;
            for (int j = 0; j < geom.size() - 1; j++) {
                double[] a = geom.get(j);
                double[] b = geom.get(j + 1);
                rawGeomLen += haversineMetres(a[0], a[1], b[0], b[1]);
            }
            double scale = rawGeomLen > 0 ? (e.lengthM() / rawGeomLen) : 0;
            for (int j = 1; j < geom.size(); j++) {
                double[] prev = geom.get(j - 1);
                double[] cur = geom.get(j);
                double d = rawGeomLen > 0
                    ? haversineMetres(prev[0], prev[1], cur[0], cur[1]) * scale
                    : (e.lengthM() / (geom.size() - 1));
                cumulM += Math.max(0, d);
                out.add(new RouteResponse.RouteShapePointDto(cumulM / 1000.0, cur[0], cur[1]));
            }
        }
        return out;
    }

    private static void appendPolylinePoints(List<double[]> acc, List<double[]> geom, boolean skipFirst) {
        if (geom == null || geom.isEmpty()) {
            return;
        }
        int start = (skipFirst && geom.size() > 1) ? 1 : 0;
        for (int i = start; i < geom.size(); i++) {
            acc.add(geom.get(i));
        }
    }

    private static List<double[]> fallbackEdgePolyline(InMemoryGraph graph, long u, long v) {
        InMemoryGraph.NodeRecord nu = graph.getNodes().get(u);
        InMemoryGraph.NodeRecord nv = graph.getNodes().get(v);
        List<double[]> pts = new ArrayList<>(2);
        if (nu != null) {
            pts.add(new double[] { nu.lat(), nu.lon() });
        }
        if (nv != null) {
            pts.add(new double[] { nv.lat(), nv.lon() });
        }
        return pts;
    }

    /** rise/run oranına göre sınıf (yüzde ≈ oran·100). */
    private static String slopeClassFromAbsRatio(double absSignedRatio) {
        double p = Math.abs(absSignedRatio) * 100.0;
        if (p < 3.0) {
            return "flat";
        }
        if (p < 8.0) {
            return "moderate";
        }
        return "steep";
    }

    private static double estimateWalkingCaloriesKcal(double weightKg, double distanceKm, double totalClimbM) {
        if (weightKg <= 0 || !Double.isFinite(distanceKm)) {
            return 0;
        }
        return weightKg * (KCAL_PER_KM_KG * distanceKm + KCAL_PER_M_CLIMB_KG * Math.max(0, totalClimbM));
    }

    private record PathSegmentMetrics(
        List<RouteResponse.RouteSegmentDto> segments,
        double avgSlopePct,
        double maxSlopePct,
        double estimatedCaloriesKcal
    ) {}

    /**
     * Tek geçişte yükselti profili + blok bazlı net tırmanış/iniş.
     * Her blokta {@code delta = Σascent − Σdescent} (kenarlar, u→v); profildeki rakım adımı ile aynı delta.
     * Pozitif deltalar toplam tırmanışa, negatif deltaların mutlakı toplam inişe eklenir (blok içi zigzag nete indirgenir).
     */
    private ElevationProfileAndClimb buildElevationProfileAndClimbDescent(InMemoryGraph graph, List<Long> path) {
        int numEdges = path.size() - 1;
        if (numEdges <= 0) {
            InMemoryGraph.NodeRecord n0 = graph.getNodes().get(path.get(0));
            double rakim = (n0 != null) ? n0.rakim() : 0;
            return new ElevationProfileAndClimb(
                List.of(new RouteResponse.ElevationProfilePoint(0, rakim)),
                new ClimbDescentM(0, 0),
                0,
                0);
        }

        InMemoryGraph.NodeRecord startNode = graph.getNodes().get(path.get(0));
        double startRakim = (startNode != null) ? startNode.rakim() : 0;

        List<RouteResponse.ElevationProfilePoint> out = new ArrayList<>();
        out.add(new RouteResponse.ElevationProfilePoint(0, startRakim));

        double cumulDistM = 0;
        double cumulElevM = startRakim;
        double climb = 0;
        double descent = 0;
        double totalLengthM = 0;
        double toblerCostSum = 0;

        for (int segStart = 0; segStart < numEdges; ) {
            int segEnd = Math.min(segStart + ELEVATION_SEGMENT_EDGES, numEdges);
            double segLengthM = 0;
            double segAscentM = 0;
            double segDescentM = 0;
            for (int i = segStart; i < segEnd; i++) {
                Long u = path.get(i);
                Long v = path.get(i + 1);
                InMemoryGraph.EdgeRecord e = getEdge(graph, u, v);
                if (e != null) {
                    segLengthM += e.lengthM();
                    segAscentM += e.ascentM();
                    segDescentM += e.descentM();
                    totalLengthM += e.lengthM();
                    toblerCostSum += e.costForward();
                }
            }
            double delta = segAscentM - segDescentM;
            if (delta > 0) {
                climb += delta;
            } else if (delta < 0) {
                descent += -delta;
            }
            cumulDistM += segLengthM;
            cumulElevM += delta;
            out.add(new RouteResponse.ElevationProfilePoint(cumulDistM / 1000.0, cumulElevM));
            segStart = segEnd;
        }

        return new ElevationProfileAndClimb(out, new ClimbDescentM(climb, descent), totalLengthM, toblerCostSum);
    }

    /** Path'teki her node'un koordinatı (lat, lon) sırayla. */
    private List<double[]> buildCoordinatesFromPathNodes(InMemoryGraph graph, List<Long> path) {
        List<double[]> coords = new ArrayList<>();
        for (Long nid : path) {
            InMemoryGraph.NodeRecord n = graph.getNodes().get(nid);
            if (n == null) continue;
            coords.add(new double[] { n.lat(), n.lon() });
        }
        return coords;
    }

    /** En yakın düğüm: grid indeksi + Haversine (tam tarama yerine). */
    private Long nearestNode(InMemoryGraph graph, double lat, double lon) {
        NodeSpatialIndex idx = graphLoader.getSpatialIndex();
        if (idx != null) {
            Long best = idx.nearest(lat, lon);
            if (best != null) {
                return best;
            }
        }
        Map<Long, InMemoryGraph.NodeRecord> nodes = graph.getNodes();
        Long fallback = null;
        double bestM = Double.POSITIVE_INFINITY;
        for (InMemoryGraph.NodeRecord n : nodes.values()) {
            double d = haversineMetres(lat, lon, n.lat(), n.lon());
            if (d < bestM) {
                bestM = d;
                fallback = n.osmid();
            }
        }
        return fallback;
    }

    /** (from, to) kenarını döndürür; yoksa null. */
    private InMemoryGraph.EdgeRecord getEdge(InMemoryGraph graph, long from, long to) {
        for (InMemoryGraph.EdgeRecord e : graph.getAdjacency().getOrDefault(from, List.of())) {
            if (e.neighborId() == to) return e;
        }
        return null;
    }

    /**
     * Tobler relative maliyet toplamından tahmini yürüyüş süresi (dakika).
     * <p>
     * Relative modda {@code maliyet = Σ L·(v_ref/v)}; fiziksel süre {@code t = Σ(L/1000)/v} saat,
     * dolayısıyla {@code t_h = (Σ maliyet) / (v_ref · 1000)}.
     * </p>
     */
    private static double minutesFromToblerRelativeCost(double totalRelativeCost) {
        if (totalRelativeCost <= 0 || !Double.isFinite(totalRelativeCost)) {
            return 0.0;
        }
        double hours = totalRelativeCost / (TOBLER_V_REF_KMH * 1000.0);
        return hours * 60.0;
    }

    /** İki (lat, lon) noktası arası kuş uçuşu mesafe (m). A* heuristic için. */
    private static double haversineMetres(double lat1, double lon1, double lat2, double lon2) {
        double R = 6_371_000; // Earth radius in metres
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * A*: f(n) = g(n) + h(n). Kenar maliyeti: {@link #edgeCostFunction}; h = kuş uçuşu (m, admissible).
     * Öncelik kuyruğunda eski (stale) g değerli girdiler, pop sonrası {@code g > dist[u]} ile atlanır.
     */
    private DijkstraResult astar(InMemoryGraph graph, long start, long end, RouteType routeType) {
        InMemoryGraph.NodeRecord endNode = graph.getNodes().get(end);
        if (endNode == null) return new DijkstraResult(List.of(), Double.POSITIVE_INFINITY);
        double endLat = endNode.lat();
        double endLon = endNode.lon();

        ToDoubleFunction<InMemoryGraph.EdgeRecord> costFn = edgeCostFunction(routeType);

        int estNodes = Math.max(16, graph.nodeCount() / 2);
        Map<Long, Double> dist = new HashMap<>(estNodes);
        Map<Long, Long> prev = new HashMap<>(estNodes);
        Map<Long, Double> hToGoal = new HashMap<>(estNodes);
        dist.put(start, 0.0);
        record HeapEntry(long nodeId, double gScore, double fScore) {}
        PriorityQueue<HeapEntry> heap = new PriorityQueue<>(Comparator.comparingDouble(HeapEntry::fScore));
        InMemoryGraph.NodeRecord startNode = graph.getNodes().get(start);
        if (startNode == null) return new DijkstraResult(List.of(), Double.POSITIVE_INFINITY);
        double gStart = 0;
        double hStart = hToGoal.computeIfAbsent(start, k ->
            haversineMetres(startNode.lat(), startNode.lon(), endLat, endLon));
        heap.offer(new HeapEntry(start, gStart, gStart + hStart));

        final double staleEps = 1e-7;

        while (!heap.isEmpty()) {
            HeapEntry cur = heap.poll();
            long u = cur.nodeId();
            double gU = cur.gScore();
            if (gU > dist.getOrDefault(u, Double.POSITIVE_INFINITY) + staleEps) {
                continue;
            }
            if (u == end) {
                break;
            }
            for (InMemoryGraph.EdgeRecord e : graph.getAdjacency().getOrDefault(u, List.of())) {
                long v = e.neighborId();
                double w = costFn.applyAsDouble(e);
                double altG = gU + w;
                if (altG >= dist.getOrDefault(v, Double.POSITIVE_INFINITY)) continue;
                InMemoryGraph.NodeRecord vNode = graph.getNodes().get(v);
                double hV = hToGoal.computeIfAbsent(v, k -> {
                    if (vNode == null) {
                        return 0.0;
                    }
                    return haversineMetres(vNode.lat(), vNode.lon(), endLat, endLon);
                });
                dist.put(v, altG);
                prev.put(v, u);
                heap.offer(new HeapEntry(v, altG, altG + hV));
            }
        }

        List<Long> path = new ArrayList<>();
        Long cur = end;
        while (cur != null) {
            path.add(cur);
            cur = prev.get(cur);
        }
        Collections.reverse(path);
        double totalCost = Double.POSITIVE_INFINITY;
        if (!path.isEmpty()) {
            Double dEnd = dist.get(end);
            totalCost = (dEnd != null) ? dEnd : Double.POSITIVE_INFINITY;
        }
        return new DijkstraResult(path, totalCost);
    }

    private static ToDoubleFunction<InMemoryGraph.EdgeRecord> edgeCostFunction(RouteType type) {
        return switch (type) {
            case SHORTEST -> InMemoryGraph.EdgeRecord::lengthM;
            case BALANCED -> e -> e.costForward() + BALANCED_ASCENT_PENALTY * e.ascentM();
            case EASIEST -> e -> e.lengthM() + EASIEST_ELEVATION_CHANGE_PENALTY * (e.ascentM() + e.descentM());
        };
    }

    private record DijkstraResult(List<Long> path, double totalCost) {}

    /** Blok bazında net delta (ascent−descent) pozitif/negatif kümülatifleri (m). */
    private record ClimbDescentM(double climbM, double descentM) {}

    /**
     * @param totalLengthM   path üzerindeki kenar uzunlukları toplamı (m)
     * @param toblerCostSum  u→v yönünde Tobler relative maliyet toplamı (süre için)
     */
    private record ElevationProfileAndClimb(
        List<RouteResponse.ElevationProfilePoint> profile,
        ClimbDescentM climbDescent,
        double totalLengthM,
        double toblerCostSum
    ) {}
}
