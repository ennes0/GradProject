package com.odos.odos_backend.graph;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Düğümleri lat/lon üzerinde düzenli ızgaraya böler; en yakın düğüm sorgusunda tam O(n) tarama yerine
 * her hücredeki düğümler bir kez değerlendirilir (genelde çok daha az Haversine).
 */
public final class NodeSpatialIndex {

    private final Map<Long, InMemoryGraph.NodeRecord> nodes;
    private final double minLat;
    private final double maxLat;
    private final double minLon;
    private final double maxLon;
    private final int gridLat;
    private final int gridLon;
    private final List<Long>[] buckets;

    @SuppressWarnings("unchecked")
    public NodeSpatialIndex(Map<Long, InMemoryGraph.NodeRecord> nodes, int cellsPerAxis) {
        this.nodes = nodes;
        int g = Math.max(8, Math.min(256, cellsPerAxis));
        this.gridLat = g;
        this.gridLon = g;
        int nCells = g * g;
        this.buckets = new List[nCells];
        for (int i = 0; i < nCells; i++) {
            buckets[i] = new ArrayList<>();
        }

        if (nodes.isEmpty()) {
            minLat = maxLat = minLon = maxLon = 0;
            return;
        }

        double minLa = Double.POSITIVE_INFINITY;
        double maxLa = Double.NEGATIVE_INFINITY;
        double minLo = Double.POSITIVE_INFINITY;
        double maxLo = Double.NEGATIVE_INFINITY;
        for (InMemoryGraph.NodeRecord n : nodes.values()) {
            minLa = Math.min(minLa, n.lat());
            maxLa = Math.max(maxLa, n.lat());
            minLo = Math.min(minLo, n.lon());
            maxLo = Math.max(maxLo, n.lon());
        }
        minLat = minLa;
        maxLat = maxLa;
        minLon = minLo;
        maxLon = maxLo;

        double spanLat = Math.max(maxLat - minLat, 1e-4);
        double spanLon = Math.max(maxLon - minLon, 1e-4);

        for (Map.Entry<Long, InMemoryGraph.NodeRecord> e : nodes.entrySet()) {
            InMemoryGraph.NodeRecord n = e.getValue();
            int ix = (int) Math.min(g - 1, Math.max(0, (n.lon() - minLon) / spanLon * g));
            int iy = (int) Math.min(g - 1, Math.max(0, (n.lat() - minLat) / spanLat * g));
            buckets[iy * g + ix].add(e.getKey());
        }
    }

    /**
     * Sorgu noktasına Haversine ile en yakın düğüm osmid; boş graf için null.
     */
    public Long nearest(double lat, double lon) {
        if (nodes.isEmpty()) {
            return null;
        }
        double spanLat = Math.max(maxLat - minLat, 1e-4);
        double spanLon = Math.max(maxLon - minLon, 1e-4);
        int cx = (int) Math.min(gridLon - 1, Math.max(0, (lon - minLon) / spanLon * gridLon));
        int cy = (int) Math.min(gridLat - 1, Math.max(0, (lat - minLat) / spanLat * gridLat));

        Long bestId = null;
        double bestD = Double.POSITIVE_INFINITY;
        int maxR = Math.max(gridLat, gridLon);
        for (int r = 0; r <= maxR; r++) {
            for (int dy = -r; dy <= r; dy++) {
                for (int dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dy), Math.abs(dx)) != r) {
                        continue;
                    }
                    int iy = cy + dy;
                    int ix = cx + dx;
                    if (iy < 0 || iy >= gridLat || ix < 0 || ix >= gridLon) {
                        continue;
                    }
                    for (Long nid : buckets[iy * gridLon + ix]) {
                        InMemoryGraph.NodeRecord n = nodes.get(nid);
                        if (n == null) {
                            continue;
                        }
                        double d = haversineMetres(lat, lon, n.lat(), n.lon());
                        if (d < bestD) {
                            bestD = d;
                            bestId = nid;
                        }
                    }
                }
            }
        }
        return bestId;
    }

    private static double haversineMetres(double lat1, double lon1, double lat2, double lon2) {
        double R = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
