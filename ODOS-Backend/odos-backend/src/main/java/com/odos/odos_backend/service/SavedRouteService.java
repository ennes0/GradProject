package com.odos.odos_backend.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.odos.odos_backend.api.dto.savedroute.CoordDto;
import com.odos.odos_backend.api.dto.savedroute.CreateSavedRouteRequest;
import com.odos.odos_backend.api.dto.savedroute.PatchSavedRouteRequest;
import com.odos.odos_backend.api.dto.savedroute.SavedRouteListItemResponse;
import com.odos.odos_backend.api.dto.savedroute.SavedRouteResponse;
import com.odos.odos_backend.entity.SavedRoute;
import com.odos.odos_backend.entity.User;
import com.odos.odos_backend.entity.UserFollow.UserFollowId;
import com.odos.odos_backend.repository.SavedRouteRepository;
import com.odos.odos_backend.repository.UserFollowRepository;
import com.odos.odos_backend.repository.UserRepository;

@Service
public class SavedRouteService {

    private static final int MAX_POLYLINE_POINTS = 6000;
    private static final List<String> ALLOWED_COMPLETION = List.of("completed", "partial", "abandoned");

    private final SavedRouteRepository savedRouteRepository;
    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final ObjectMapper objectMapper;

    public SavedRouteService(
        SavedRouteRepository savedRouteRepository,
        UserRepository userRepository,
        UserFollowRepository userFollowRepository,
        ObjectMapper objectMapper
    ) {
        this.savedRouteRepository = savedRouteRepository;
        this.userRepository = userRepository;
        this.userFollowRepository = userFollowRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<SavedRouteListItemResponse> listForUser(UUID userId, int limit) {
        int safe = Math.min(200, Math.max(1, limit));
        return savedRouteRepository
            .findByUserIdOrderByFinishedAtDesc(userId, PageRequest.of(0, safe))
            .stream()
            .map(this::toListItem)
            .toList();
    }

    @Transactional(readOnly = true)
    public SavedRouteResponse get(UUID userId, UUID id) {
        SavedRoute row = savedRouteRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kayıt bulunamadı"));
        return toResponse(row);
    }

    /**
     * Takip edilen kullanıcının paylaştığı (is_shared) rota için önizleme.
     * Rota sahibi dışındaki izleyiciler yalnızca rotayı paylaşan kişiyi takip ediyorsa görebilir.
     */
    @Transactional(readOnly = true)
    public SavedRouteResponse getSharedCommunityPreview(UUID viewerId, UUID routeId) {
        SavedRoute route = savedRouteRepository.findById(routeId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Rota bulunamadı"));
        if (!route.isShared()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Rota bulunamadı");
        }
        UUID ownerId = route.getUserId();
        if (!viewerId.equals(ownerId)) {
            User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı"));
            if (owner.isPublic()) {
                return toResponse(route);
            }
            boolean followsOwner = userFollowRepository.existsById(new UserFollowId(viewerId, ownerId));
            if (!followsOwner) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu rotayı görüntüleme yetkiniz yok");
            }
        }
        return toResponse(route);
    }

    @Transactional
    public SavedRouteResponse create(UUID userId, CreateSavedRouteRequest req) {
        String status = normalizeCompletion(req.completionStatus());
        List<CoordDto> poly = truncatePolyline(req.routePolyline());

        SavedRoute e = new SavedRoute();
        e.setUserId(userId);
        e.setTitle(req.title().trim());
        e.setStartLabel(trimToNull(req.startLabel()));
        e.setEndLabel(trimToNull(req.endLabel()));
        e.setRouteType(trimToNull(req.routeType()));
        e.setDifficulty(trimToNull(req.difficulty()));
        e.setCompletionStatus(status);
        e.setCompletionRatio(clamp01(req.completionRatio()));
        e.setPlannedDistanceM(req.plannedDistanceM());
        e.setTraveledDistanceM(req.traveledDistanceM());
        e.setElapsedSeconds(Math.max(0, req.elapsedSeconds()));
        e.setAvgSpeedKmh(req.avgSpeedKmh());
        e.setPaceSecPerKm(req.paceSecPerKm());
        e.setCaloriesKcal(req.caloriesKcal());
        e.setClimbM(req.climbM());
        e.setRerouteCount(req.rerouteCount() != null ? Math.max(0, req.rerouteCount()) : 0);
        e.setMaxOffRouteDistanceM(req.maxOffRouteDistanceM() != null ? Math.max(0, req.maxOffRouteDistanceM()) : 0);
        e.setAvgSlopePct(req.avgSlopePct());
        e.setMaxSlopePct(req.maxSlopePct());
        e.setElevationGainM(req.elevationGainM());
        e.setSteps(req.steps());
        e.setMood(trimToNull(req.mood()));
        e.setWeatherSummary(trimToNull(req.weatherSummary()));
        e.setTemperatureLabel(trimToNull(req.temperatureLabel()));
        e.setNotes(trimToNull(req.notes()));
        e.setImageUrl(trimToNull(req.imageUrl()));
        e.setFavorite(Boolean.TRUE.equals(req.favorite()));
        e.setStartedAt(req.startedAt());
        e.setFinishedAt(req.finishedAt());
        e.setRoutePolylineJson(writeJson(poly));
        e.setElevationSeriesJson(writeJson(req.elevationSeries()));
        e.setSessionExtrasJson(writeJson(req.sessionExtras()));

        savedRouteRepository.save(e);
        return toResponse(e);
    }

    private SavedRouteListItemResponse toListItem(SavedRoute e) {
        return new SavedRouteListItemResponse(
            e.getId(),
            e.getTitle(),
            e.getStartLabel(),
            e.getEndLabel(),
            e.getRouteType(),
            e.getDifficulty(),
            e.getCompletionStatus(),
            e.getCompletionRatio(),
            e.getPlannedDistanceM(),
            e.getTraveledDistanceM(),
            e.getElapsedSeconds(),
            e.getAvgSpeedKmh(),
            e.getPaceSecPerKm(),
            e.getCaloriesKcal(),
            e.getClimbM(),
            e.getRerouteCount(),
            e.getMaxOffRouteDistanceM(),
            e.getAvgSlopePct(),
            e.getMaxSlopePct(),
            e.getElevationGainM(),
            e.getSteps(),
            e.getMood(),
            e.getWeatherSummary(),
            e.getTemperatureLabel(),
            e.getNotes(),
            e.getImageUrl(),
            e.isFavorite(),
            e.getStartedAt(),
            e.getFinishedAt(),
            e.getCreatedAt()
        );
    }

    @Transactional
    public SavedRouteResponse patch(UUID userId, UUID id, PatchSavedRouteRequest req) {
        SavedRoute e = savedRouteRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kayıt bulunamadı"));
        if (req.favorite() != null) {
            e.setFavorite(req.favorite());
        }
        if (req.title() != null) {
            String t = req.title().trim();
            if (!t.isEmpty()) {
                e.setTitle(t.length() > 200 ? t.substring(0, 200) : t);
            }
        }
        if (req.notes() != null) {
            e.setNotes(req.notes().trim().isEmpty() ? null : req.notes().trim());
        }
        if (req.mood() != null) {
            e.setMood(trimToNull(req.mood()));
        }
        savedRouteRepository.save(e);
        return toResponse(e);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        SavedRoute e = savedRouteRepository.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kayıt bulunamadı"));
        savedRouteRepository.delete(e);
    }

    private String normalizeCompletion(String raw) {
        if (raw == null) {
            return "completed";
        }
        String s = raw.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_COMPLETION.contains(s)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "completionStatus completed|partial|abandoned olmali");
        }
        return s;
    }

    private static double clamp01(Double v) {
        if (v == null) {
            return 0;
        }
        return Math.max(0, Math.min(1, v));
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static List<CoordDto> truncatePolyline(List<CoordDto> in) {
        if (in == null || in.isEmpty()) {
            return null;
        }
        List<CoordDto> valid = new ArrayList<>();
        for (CoordDto c : in) {
            if (c == null || c.lat() == null || c.lon() == null) {
                continue;
            }
            if (!Double.isFinite(c.lat()) || !Double.isFinite(c.lon())) {
                continue;
            }
            valid.add(c);
        }
        if (valid.isEmpty()) {
            return null;
        }
        if (valid.size() <= MAX_POLYLINE_POINTS) {
            return valid;
        }
        int step = (int) Math.ceil(valid.size() / (double) MAX_POLYLINE_POINTS);
        List<CoordDto> out = new ArrayList<>(MAX_POLYLINE_POINTS + 1);
        for (int i = 0; i < valid.size(); i += step) {
            out.add(valid.get(i));
        }
        return out;
    }

    private String writeJson(Object value) {
        if (value == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JSON serilestirme hatasi");
        }
    }

    private SavedRouteResponse toResponse(SavedRoute e) {
        return new SavedRouteResponse(
            e.getId(),
            e.getTitle(),
            e.getStartLabel(),
            e.getEndLabel(),
            e.getRouteType(),
            e.getDifficulty(),
            e.getCompletionStatus(),
            e.getCompletionRatio(),
            e.getPlannedDistanceM(),
            e.getTraveledDistanceM(),
            e.getElapsedSeconds(),
            e.getAvgSpeedKmh(),
            e.getPaceSecPerKm(),
            e.getCaloriesKcal(),
            e.getClimbM(),
            e.getRerouteCount(),
            e.getMaxOffRouteDistanceM(),
            e.getAvgSlopePct(),
            e.getMaxSlopePct(),
            e.getElevationGainM(),
            e.getSteps(),
            e.getMood(),
            e.getWeatherSummary(),
            e.getTemperatureLabel(),
            e.getNotes(),
            e.getImageUrl(),
            e.isFavorite(),
            e.getStartedAt(),
            e.getFinishedAt(),
            e.getCreatedAt(),
            e.getRoutePolylineJson(),
            e.getElevationSeriesJson(),
            e.getSessionExtrasJson()
        );
    }
}
