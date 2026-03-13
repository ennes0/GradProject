package com.odos.odos_backend.graph;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Bellekte tutulan yol grafı.
 * - nodes: node id → (lon, lat, rakim)
 * - adjacency: node id → bu düğümden çıkan kenarlar
 * - edgeGeometries: (u,v) → kenar geometrisi (u→v yönünde [lat,lon] listesi); çizimde kenar sırası garanti
 */
public class InMemoryGraph {

    private final Map<Long, NodeRecord> nodes;
    private final Map<Long, List<EdgeRecord>> adjacency;
    private final Map<EdgeKey, List<double[]>> edgeGeometries;

    public InMemoryGraph(Map<Long, NodeRecord> nodes, Map<Long, List<EdgeRecord>> adjacency) {
        this(nodes, adjacency, Map.of());
    }

    public InMemoryGraph(Map<Long, NodeRecord> nodes, Map<Long, List<EdgeRecord>> adjacency,
                         Map<EdgeKey, List<double[]>> edgeGeometries) {
        this.nodes = nodes;
        this.adjacency = adjacency;
        this.edgeGeometries = edgeGeometries != null ? edgeGeometries : Map.of();
    }

    /** Path yönünde geometri from→to: (from,to) veya (to,from) kayıtlıysa uygun yönde döner. */
    public List<double[]> getEdgeGeometry(long from, long to) {
        EdgeKey fwd = new EdgeKey(from, to);
        List<double[]> geom = edgeGeometries.get(fwd);
        if (geom != null) return geom;
        EdgeKey rev = new EdgeKey(to, from);
        geom = edgeGeometries.get(rev);
        if (geom == null) return null;
        List<double[]> reversed = new ArrayList<>(geom.size());
        for (int i = geom.size() - 1; i >= 0; i--) reversed.add(geom.get(i));
        return reversed;
    }

    public record EdgeKey(long u, long v) {}

    public Map<Long, NodeRecord> getNodes() {
        return nodes;
    }

    public Map<Long, List<EdgeRecord>> getAdjacency() {
        return adjacency;
    }

    public int nodeCount() {
        return nodes.size();
    }

    public int edgeCount() {
        return adjacency.values().stream().mapToInt(List::size).sum();
    }

    /** Düğüm: osmid, lon, lat, rakim (m) */
    public record NodeRecord(long osmid, double lon, double lat, double rakim) {}

    /** Kenar: tablo fid (id), komşu düğüm id, u→v maliyeti, v→u maliyeti, uzunluk (m), u→v yönünde tırmanış (m), u→v yönünde iniş (m) */
    public record EdgeRecord(long edgeId, long neighborId, double costForward, double costBackward, double lengthM,
                             double ascentM, double descentM) {}
}
