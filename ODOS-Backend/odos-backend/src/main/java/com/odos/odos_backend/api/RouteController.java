package com.odos.odos_backend.api;

import com.odos.odos_backend.api.dto.RouteResponse;
import com.odos.odos_backend.api.dto.RoutesResponse;
import com.odos.odos_backend.service.RouteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Rota API: GET /v1/route (tek rota), GET /v1/routes (3 öneri: En Kısa, En Hızlı, En Kolay).
 */
@RestController
@RequestMapping("/v1")
public class RouteController {

    private final RouteService routeService;

    public RouteController(RouteService routeService) {
        this.routeService = routeService;
    }

    @GetMapping("/route")
    public ResponseEntity<RouteResponse> getRoute(
        @RequestParam double origin_lat,
        @RequestParam double origin_lon,
        @RequestParam double dest_lat,
        @RequestParam double dest_lon
    ) {
        RouteResponse response = routeService.findRoute(origin_lat, origin_lon, dest_lat, dest_lon);
        if (response.error() != null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/routes")
    public ResponseEntity<RoutesResponse> getRoutes(
        @RequestParam double origin_lat,
        @RequestParam double origin_lon,
        @RequestParam double dest_lat,
        @RequestParam double dest_lon
    ) {
        RoutesResponse response = routeService.findRoutes(origin_lat, origin_lon, dest_lat, dest_lon);
        if (response.error() != null) {
            return ResponseEntity.badRequest().body(response);
        }
        return ResponseEntity.ok(response);
    }
}
