package com.odos.odos_backend.graph;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Uygulama açılışında nodes ve edges tablolarını okuyup InMemoryGraph oluşturur.
 * PostGIS: nodes için ST_X(geom), ST_Y(geom); edges için u, v, maliyet_uv, maliyet_vu, length.
 */
@Component
public class GraphLoader {

    private static final Logger log = LoggerFactory.getLogger(GraphLoader.class);

    private final JdbcTemplate jdbc;
    private final boolean loadEdgeGeometry;
    private final int spatialGridCells;
    private InMemoryGraph graph;
    private NodeSpatialIndex spatialIndex;

    public GraphLoader(JdbcTemplate jdbc,
                       @Value("${odos.graph.load-edge-geometry:false}") boolean loadEdgeGeometry,
                       @Value("${odos.graph.spatial-grid:64}") int spatialGridCells) {
        this.jdbc = jdbc;
        this.loadEdgeGeometry = loadEdgeGeometry;
        this.spatialGridCells = Math.max(8, Math.min(256, spatialGridCells));
    }

    @PostConstruct
    public void loadGraph() {
        log.info("Graf yükleniyor (nodes + edges)...");
        Map<Long, InMemoryGraph.NodeRecord> nodes = loadNodes();
        Map<Long, List<InMemoryGraph.EdgeRecord>> adjacency = loadEdges();
        Map<InMemoryGraph.EdgeKey, List<double[]>> edgeGeometries = loadEdgeGeometry
            ? loadEdgeGeometriesFromDb()
            : Map.of();
        this.graph = new InMemoryGraph(nodes, adjacency, edgeGeometries);
        this.spatialIndex = new NodeSpatialIndex(nodes, spatialGridCells);
        log.info("Graf yüklendi: {} düğüm, {} yönlü kenar, {} kenar geometrisi (load-edge-geometry={})",
            graph.nodeCount(), graph.edgeCount(), edgeGeometries.size(), loadEdgeGeometry);
    }

    public InMemoryGraph getGraph() {
        return graph;
    }

    public NodeSpatialIndex getSpatialIndex() {
        return spatialIndex;
    }

    private Map<Long, InMemoryGraph.NodeRecord> loadNodes() {
        String sql = "SELECT osmid, ST_X(geom) AS lon, ST_Y(geom) AS lat, COALESCE(rakim, 0) AS rakim FROM nodes";
        Map<Long, InMemoryGraph.NodeRecord> map = new HashMap<>();
        jdbc.query(sql, rs -> {
            long osmid = rs.getLong("osmid");
            double lon = rs.getDouble("lon");
            double lat = rs.getDouble("lat");
            double rakim = rs.getDouble("rakim");
            map.put(osmid, new InMemoryGraph.NodeRecord(osmid, lon, lat, rakim));
        });
        return map;
    }

    /** Kenarları yükler: her satır (u,v) için u→v ve v→u eklenir; fid, total_ascent, total_descent (u→v yönü) saklanır. */
    private Map<Long, List<InMemoryGraph.EdgeRecord>> loadEdges() {
        String sql = "SELECT u, v, maliyet_uv, maliyet_vu, length, fid, "
            + "COALESCE(total_ascent, 0) AS total_ascent, COALESCE(total_descent, 0) AS total_descent, "
            + "COALESCE(mean_grade, 0) AS mean_grade, COALESCE(mean_absolute_grade, 0) AS mean_absolute_grade "
            + "FROM edges";
        Map<Long, List<InMemoryGraph.EdgeRecord>> adj = new HashMap<>();
        jdbc.query(sql, rs -> {
            long u = rs.getLong("u");
            long v = rs.getLong("v");
            double costUV = rs.getDouble("maliyet_uv");
            double costVU = rs.getDouble("maliyet_vu");
            double length = rs.getDouble("length");
            long fid = rs.getLong("fid");
            double ascentUV = rs.getDouble("total_ascent");
            double descentUV = rs.getDouble("total_descent");
            double meanGrade = rs.getDouble("mean_grade");
            double meanAbs = rs.getDouble("mean_absolute_grade");
            adj.computeIfAbsent(u, k -> new ArrayList<>()).add(
                new InMemoryGraph.EdgeRecord(fid, v, costUV, costVU, length, ascentUV, descentUV, meanGrade, meanAbs));
            adj.computeIfAbsent(v, k -> new ArrayList<>()).add(
                new InMemoryGraph.EdgeRecord(fid, u, costVU, costUV, length, descentUV, ascentUV, -meanGrade, meanAbs));
        });
        return adj;
    }

    /** Kenar geometrilerini yükler: her satır (u,v) → WKT geometrisi u→v olarak saklanır (DB sırası). */
    private Map<InMemoryGraph.EdgeKey, List<double[]>> loadEdgeGeometriesFromDb() {
        Map<InMemoryGraph.EdgeKey, List<double[]>> map = new HashMap<>();
        try {
            String sql = "SELECT u, v, ST_AsText(ST_Transform(geom, 4326)) AS wkt FROM edges WHERE geom IS NOT NULL";
            jdbc.query(sql, rs -> {
                long u = rs.getLong("u");
                long v = rs.getLong("v");
                String wkt = rs.getString("wkt");
                if (wkt == null || wkt.isBlank()) return;
                List<double[]> coords = parseLineStringWkt(wkt);
                if (!coords.isEmpty()) map.put(new InMemoryGraph.EdgeKey(u, v), coords);
            });
        } catch (Exception e) {
            log.warn("Kenar geometrisi yüklenemedi (edges.geom yok veya farklı SRID olabilir): {}", e.getMessage());
        }
        return map;
    }

    /** WKT LINESTRING(lon lat, lon lat, ...) → [[lat,lon], ...] */
    private static List<double[]> parseLineStringWkt(String wkt) {
        List<double[]> out = new ArrayList<>();
        if (wkt == null) return out;
        String upper = wkt.trim().toUpperCase();
        if (!upper.startsWith("LINESTRING")) return out;
        int start = wkt.indexOf('(');
        int end = wkt.lastIndexOf(')');
        if (start < 0 || end <= start) return out;
        String body = wkt.substring(start + 1, end).trim();
        for (String pair : body.split(",")) {
            String[] parts = pair.trim().split("\\s+");
            if (parts.length >= 2) {
                try {
                    double lon = Double.parseDouble(parts[0]);
                    double lat = Double.parseDouble(parts[1]);
                    out.add(new double[] { lat, lon });
                } catch (NumberFormatException ignored) { }
            }
        }
        return out;
    }
}
