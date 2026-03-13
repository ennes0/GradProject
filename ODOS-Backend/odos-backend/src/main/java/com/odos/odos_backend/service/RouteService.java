package com.odos.odos_backend.service;

import com.odos.odos_backend.api.dto.RouteResponse;
import com.odos.odos_backend.api.dto.RoutesResponse;
import com.odos.odos_backend.graph.GraphLoader;
import com.odos.odos_backend.graph.InMemoryGraph;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.ToDoubleFunction;

/**
 * Rota hesaplama: en yakın düğüm snap + A* (heuristic: hedefe kuş uçuşu mesafe).
 * Üç seçenek: En Hızlı (Tobler), Dengeli (Tobler + ılımlı tırmanış), En Kolay (eğim değişimi min).
 */
@Service
public class RouteService {

    private static final Logger log = LoggerFactory.getLogger(RouteService.class);
    private static final double METRE_PER_MINUTE = 80.0;
    /** 3–4 node’luk parça ≈ 45–60 m; gürültü azaltma ve normalize profili için. */
    private static final int ELEVATION_SEGMENT_EDGES = 3;
    /** Dengeli: Tobler maliyetine eklenen tırmanış cezası (1 m tırmanış ≈ bu kadar metre). */
    private static final double BALANCED_ASCENT_PENALTY = 18.0;
    /** En kolay: eğim değişimini min (1 m çıkış+iniş ≈ bu kadar metre); düz yol deneyimi. */
    private static final double EASIEST_ELEVATION_CHANGE_PENALTY = 40.0;

    public enum RouteType {
        FASTEST,   // Tobler – tahmini en kısa süre
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
            return RouteResponse.ok(coords, List.of(List.of(coords.get(0), coords.get(1))), 0, 0, 0, 0, 0, List.of(), null, null);
        }

        DijkstraResult result = astar(graph, startNode, endNode, RouteType.FASTEST);
        if (result.path.isEmpty()) {
            return RouteResponse.error("Rota bulunamadı");
        }

        // Path node'larından koordinat listesi.
        List<double[]> coordinates = buildCoordinatesFromPathNodes(graph, result.path);
        List<List<double[]>> segments = List.of();
        double totalLength = 0;
        double totalClimb = 0;
        double totalDescent = 0;
        for (int i = 0; i < result.path.size() - 1; i++) {
            Long u = result.path.get(i);
            Long v = result.path.get(i + 1);
            totalLength += getEdgeLength(graph, u, v);
            InMemoryGraph.EdgeRecord e = getEdge(graph, u, v);
            if (e != null) {
                totalClimb += e.ascentM();
                totalDescent += e.descentM();
                log.info("[ROUTE] step {}: {} -> {}  ascent={}m descent={}m", i, u, v, e.ascentM(), e.descentM());
            }
        }
        double durationMin = result.totalCost / METRE_PER_MINUTE;

        log.info("[ROUTE] total climb={}m total descent={}m", totalClimb, totalDescent);

        List<RouteResponse.ElevationProfilePoint> elevationProfile = buildElevationProfile(graph, result.path);
        Double startElevM = null;
        Double endElevM = null;
        InMemoryGraph.NodeRecord firstNode = graph.getNodes().get(result.path.get(0));
        InMemoryGraph.NodeRecord lastNode = graph.getNodes().get(result.path.get(result.path.size() - 1));
        if (firstNode != null) startElevM = firstNode.rakim();
        if (lastNode != null) endElevM = lastNode.rakim();

        return RouteResponse.ok(coordinates, segments, totalLength / 1000.0, durationMin, totalClimb, totalDescent, result.totalCost, elevationProfile, startElevM, endElevM);
    }

    /**
     * 3 rota önerisi: En Hızlı (Tobler), Dengeli (Tobler + ascent cezası), En Kolay (eğim değişimi min).
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
                "fastest", "En Hızlı", coords, 0, 0, 0, 0,
                List.of(new RouteResponse.ElevationProfilePoint(0, rakim)), rakim, rakim);
            return RoutesResponse.ok(List.of(single));
        }

        List<RoutesResponse.RouteVariantDto> list = new ArrayList<>();
        for (RouteType type : new RouteType[] { RouteType.FASTEST, RouteType.BALANCED, RouteType.EASIEST }) {
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
        double totalLengthM = 0;
        double totalClimb = 0;
        double totalDescent = 0;
        double toblerCost = 0;
        for (int i = 0; i < path.size() - 1; i++) {
            Long u = path.get(i);
            Long v = path.get(i + 1);
            InMemoryGraph.EdgeRecord e = getEdge(graph, u, v);
            if (e != null) {
                totalLengthM += e.lengthM();
                totalClimb += e.ascentM();
                totalDescent += e.descentM();
                toblerCost += e.costForward();
            }
        }
        double durationMin = toblerCost / METRE_PER_MINUTE;
        List<RouteResponse.ElevationProfilePoint> elevationProfile = buildElevationProfile(graph, path);
        InMemoryGraph.NodeRecord first = graph.getNodes().get(path.get(0));
        InMemoryGraph.NodeRecord last = graph.getNodes().get(path.get(path.size() - 1));
        Double startElevM = first != null ? first.rakim() : null;
        Double endElevM = last != null ? last.rakim() : null;

        String typeStr = type.name().toLowerCase(Locale.ROOT);
        String label = type == RouteType.FASTEST ? "En Hızlı" : type == RouteType.BALANCED ? "Dengeli" : "En Kolay";
        return new RoutesResponse.RouteVariantDto(
            typeStr, label, coordinates,
            totalLengthM / 1000.0, durationMin, totalClimb, totalDescent,
            elevationProfile, startElevM, endElevM);
    }

    /**
     * Path’i 3–4 node’luk parçalara böler; her parçada ascent/descent toplanır.
     * Profil: mutlak rakım (m) – ilk nokta başlangıç rakımı, sonra her parça sonunda başlangıç + kümülatif net değişim.
     */
    private List<RouteResponse.ElevationProfilePoint> buildElevationProfile(InMemoryGraph graph, List<Long> path) {
        int numEdges = path.size() - 1;
        if (numEdges <= 0) {
            InMemoryGraph.NodeRecord n0 = graph.getNodes().get(path.get(0));
            double rakim = (n0 != null) ? n0.rakim() : 0;
            return List.of(new RouteResponse.ElevationProfilePoint(0, rakim));
        }

        InMemoryGraph.NodeRecord startNode = graph.getNodes().get(path.get(0));
        double startRakim = (startNode != null) ? startNode.rakim() : 0;

        List<RouteResponse.ElevationProfilePoint> out = new ArrayList<>();
        out.add(new RouteResponse.ElevationProfilePoint(0, startRakim));

        double cumulDistM = 0;
        double cumulElevM = startRakim;

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
                }
            }
            cumulDistM += segLengthM;
            cumulElevM += (segAscentM - segDescentM);
            out.add(new RouteResponse.ElevationProfilePoint(cumulDistM / 1000.0, cumulElevM));
            segStart = segEnd;
        }

        return out;
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

    private Long nearestNode(InMemoryGraph graph, double lat, double lon) {
        Map<Long, InMemoryGraph.NodeRecord> nodes = graph.getNodes();
        Long best = null;
        double bestDist2 = Double.POSITIVE_INFINITY;
        for (InMemoryGraph.NodeRecord n : nodes.values()) {
            double d2 = (n.lat() - lat) * (n.lat() - lat) + (n.lon() - lon) * (n.lon() - lon);
            if (d2 < bestDist2) {
                bestDist2 = d2;
                best = n.osmid();
            }
        }
        return best;
    }

    private double getEdgeLength(InMemoryGraph graph, long from, long to) {
        InMemoryGraph.EdgeRecord e = getEdge(graph, from, to);
        return e != null ? e.lengthM() : 0;
    }

    /** (from, to) kenarını döndürür; yoksa null. */
    private InMemoryGraph.EdgeRecord getEdge(InMemoryGraph graph, long from, long to) {
        for (InMemoryGraph.EdgeRecord e : graph.getAdjacency().getOrDefault(from, List.of())) {
            if (e.neighborId() == to) return e;
        }
        return null;
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
     * A*: f(n) = g(n) + h(n). Edge cost: FASTEST=Tobler, BALANCED=Tobler+k*ascent, EASIEST=length+k*(ascent+descent).
     */
    private DijkstraResult astar(InMemoryGraph graph, long start, long end, RouteType routeType) {
        InMemoryGraph.NodeRecord endNode = graph.getNodes().get(end);
        if (endNode == null) return new DijkstraResult(List.of(), Double.POSITIVE_INFINITY);
        double endLat = endNode.lat();
        double endLon = endNode.lon();

        ToDoubleFunction<InMemoryGraph.EdgeRecord> costFn = edgeCostFunction(routeType);

        Map<Long, Double> dist = new HashMap<>();
        Map<Long, Long> prev = new HashMap<>();
        dist.put(start, 0.0);
        record HeapEntry(long nodeId, double fScore) {}
        PriorityQueue<HeapEntry> heap = new PriorityQueue<>(Comparator.comparingDouble(HeapEntry::fScore));
        double gStart = 0;
        double hStart = haversineMetres(
            graph.getNodes().get(start).lat(), graph.getNodes().get(start).lon(),
            endLat, endLon);
        heap.offer(new HeapEntry(start, gStart + hStart));
        Set<Long> visited = new HashSet<>();

        while (!heap.isEmpty()) {
            HeapEntry cur = heap.poll();
            long u = cur.nodeId();
            if (u == end) break;
            if (!visited.add(u)) continue;
            double gU = dist.getOrDefault(u, Double.POSITIVE_INFINITY);
            for (InMemoryGraph.EdgeRecord e : graph.getAdjacency().getOrDefault(u, List.of())) {
                long v = e.neighborId();
                double w = costFn.applyAsDouble(e);
                double altG = gU + w;
                if (altG >= dist.getOrDefault(v, Double.POSITIVE_INFINITY)) continue;
                InMemoryGraph.NodeRecord vNode = graph.getNodes().get(v);
                double hV = (vNode != null) ? haversineMetres(vNode.lat(), vNode.lon(), endLat, endLon) : 0;
                dist.put(v, altG);
                prev.put(v, u);
                heap.offer(new HeapEntry(v, altG + hV));
            }
        }

        List<Long> path = new ArrayList<>();
        Long cur = end;
        while (cur != null) {
            path.add(cur);
            cur = prev.get(cur);
        }
        Collections.reverse(path);
        double totalCost = path.isEmpty() ? Double.POSITIVE_INFINITY : dist.getOrDefault(end, Double.POSITIVE_INFINITY);
        return new DijkstraResult(path, totalCost);
    }

    private static ToDoubleFunction<InMemoryGraph.EdgeRecord> edgeCostFunction(RouteType type) {
        return switch (type) {
            case FASTEST -> InMemoryGraph.EdgeRecord::costForward;
            case BALANCED -> e -> e.costForward() + BALANCED_ASCENT_PENALTY * e.ascentM();
            case EASIEST -> e -> e.lengthM() + EASIEST_ELEVATION_CHANGE_PENALTY * (e.ascentM() + e.descentM());
        };
    }

    private record DijkstraResult(List<Long> path, double totalCost) {}
}
