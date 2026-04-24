package com.odos.odos_backend.api;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.odos.odos_backend.api.dto.savedroute.CreateSavedRouteRequest;
import com.odos.odos_backend.api.dto.savedroute.PatchSavedRouteRequest;
import com.odos.odos_backend.api.dto.savedroute.SavedRouteListItemResponse;
import com.odos.odos_backend.api.dto.savedroute.SavedRouteResponse;
import com.odos.odos_backend.service.SavedRouteService;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/saved-routes")
public class SavedRouteController {

    private final SavedRouteService savedRouteService;

    public SavedRouteController(SavedRouteService savedRouteService) {
        this.savedRouteService = savedRouteService;
    }

    @GetMapping
    public List<SavedRouteListItemResponse> list(Authentication authentication, @RequestParam(defaultValue = "80") int limit) {
        UUID userId = UUID.fromString(authentication.getName());
        return savedRouteService.listForUser(userId, limit);
    }

    @GetMapping("/{id}")
    public SavedRouteResponse get(Authentication authentication, @PathVariable UUID id) {
        UUID userId = UUID.fromString(authentication.getName());
        return savedRouteService.get(userId, id);
    }

    @PostMapping
    public ResponseEntity<SavedRouteResponse> create(
        Authentication authentication,
        @Valid @RequestBody CreateSavedRouteRequest body
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        SavedRouteResponse created = savedRouteService.create(userId, body);
        return ResponseEntity.ok(created);
    }

    @PatchMapping("/{id}")
    public SavedRouteResponse patch(
        Authentication authentication,
        @PathVariable UUID id,
        @Valid @RequestBody PatchSavedRouteRequest body
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return savedRouteService.patch(userId, id, body);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable UUID id) {
        UUID userId = UUID.fromString(authentication.getName());
        savedRouteService.delete(userId, id);
        return ResponseEntity.noContent().build();
    }
}
