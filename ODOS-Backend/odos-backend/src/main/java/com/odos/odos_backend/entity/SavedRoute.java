package com.odos.odos_backend.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "saved_routes")
public class SavedRoute {

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "start_label", length = 400)
    private String startLabel;

    @Column(name = "end_label", length = 400)
    private String endLabel;

    @Column(name = "route_type", length = 32)
    private String routeType;

    @Column(length = 16)
    private String difficulty;

    @Column(name = "completion_status", nullable = false, length = 32)
    private String completionStatus = "completed";

    @Column(name = "completion_ratio", nullable = false)
    private double completionRatio = 1.0;

    @Column(name = "planned_distance_m")
    private Double plannedDistanceM;

    @Column(name = "traveled_distance_m")
    private Double traveledDistanceM;

    @Column(name = "elapsed_seconds", nullable = false)
    private int elapsedSeconds;

    @Column(name = "avg_speed_kmh")
    private Double avgSpeedKmh;

    @Column(name = "pace_sec_per_km")
    private Double paceSecPerKm;

    @Column(name = "calories_kcal")
    private Integer caloriesKcal;

    @Column(name = "climb_m")
    private Integer climbM;

    @Column(name = "reroute_count", nullable = false)
    private int rerouteCount;

    @Column(name = "max_off_route_distance_m", nullable = false)
    private double maxOffRouteDistanceM;

    @Column(name = "avg_slope_pct")
    private Double avgSlopePct;

    @Column(name = "max_slope_pct")
    private Double maxSlopePct;

    @Column(name = "elevation_gain_m")
    private Double elevationGainM;

    private Integer steps;

    @Column(length = 32)
    private String mood;

    @Column(name = "weather_summary", length = 120)
    private String weatherSummary;

    @Column(name = "temperature_label", length = 32)
    private String temperatureLabel;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "is_shared", nullable = false)
    private boolean shared = true;

    @Column(name = "is_favorite", nullable = false)
    private boolean favorite;

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "finished_at", nullable = false)
    private OffsetDateTime finishedAt;

    /** PostgreSQL jsonb: String + SqlTypes.JSON ile doğru JDBC tipi (yoksa varchar hatası). */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "route_polyline_json", columnDefinition = "jsonb")
    private String routePolylineJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "elevation_series_json", columnDefinition = "jsonb")
    private String elevationSeriesJson;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "session_extras_json", columnDefinition = "jsonb")
    private String sessionExtrasJson;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
        if (finishedAt == null) {
            finishedAt = now;
        }
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getStartLabel() {
        return startLabel;
    }

    public void setStartLabel(String startLabel) {
        this.startLabel = startLabel;
    }

    public String getEndLabel() {
        return endLabel;
    }

    public void setEndLabel(String endLabel) {
        this.endLabel = endLabel;
    }

    public String getRouteType() {
        return routeType;
    }

    public void setRouteType(String routeType) {
        this.routeType = routeType;
    }

    public String getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(String difficulty) {
        this.difficulty = difficulty;
    }

    public String getCompletionStatus() {
        return completionStatus;
    }

    public void setCompletionStatus(String completionStatus) {
        this.completionStatus = completionStatus;
    }

    public double getCompletionRatio() {
        return completionRatio;
    }

    public void setCompletionRatio(double completionRatio) {
        this.completionRatio = completionRatio;
    }

    public Double getPlannedDistanceM() {
        return plannedDistanceM;
    }

    public void setPlannedDistanceM(Double plannedDistanceM) {
        this.plannedDistanceM = plannedDistanceM;
    }

    public Double getTraveledDistanceM() {
        return traveledDistanceM;
    }

    public void setTraveledDistanceM(Double traveledDistanceM) {
        this.traveledDistanceM = traveledDistanceM;
    }

    public int getElapsedSeconds() {
        return elapsedSeconds;
    }

    public void setElapsedSeconds(int elapsedSeconds) {
        this.elapsedSeconds = elapsedSeconds;
    }

    public Double getAvgSpeedKmh() {
        return avgSpeedKmh;
    }

    public void setAvgSpeedKmh(Double avgSpeedKmh) {
        this.avgSpeedKmh = avgSpeedKmh;
    }

    public Double getPaceSecPerKm() {
        return paceSecPerKm;
    }

    public void setPaceSecPerKm(Double paceSecPerKm) {
        this.paceSecPerKm = paceSecPerKm;
    }

    public Integer getCaloriesKcal() {
        return caloriesKcal;
    }

    public void setCaloriesKcal(Integer caloriesKcal) {
        this.caloriesKcal = caloriesKcal;
    }

    public Integer getClimbM() {
        return climbM;
    }

    public void setClimbM(Integer climbM) {
        this.climbM = climbM;
    }

    public int getRerouteCount() {
        return rerouteCount;
    }

    public void setRerouteCount(int rerouteCount) {
        this.rerouteCount = rerouteCount;
    }

    public double getMaxOffRouteDistanceM() {
        return maxOffRouteDistanceM;
    }

    public void setMaxOffRouteDistanceM(double maxOffRouteDistanceM) {
        this.maxOffRouteDistanceM = maxOffRouteDistanceM;
    }

    public Double getAvgSlopePct() {
        return avgSlopePct;
    }

    public void setAvgSlopePct(Double avgSlopePct) {
        this.avgSlopePct = avgSlopePct;
    }

    public Double getMaxSlopePct() {
        return maxSlopePct;
    }

    public void setMaxSlopePct(Double maxSlopePct) {
        this.maxSlopePct = maxSlopePct;
    }

    public Double getElevationGainM() {
        return elevationGainM;
    }

    public void setElevationGainM(Double elevationGainM) {
        this.elevationGainM = elevationGainM;
    }

    public Integer getSteps() {
        return steps;
    }

    public void setSteps(Integer steps) {
        this.steps = steps;
    }

    public String getMood() {
        return mood;
    }

    public void setMood(String mood) {
        this.mood = mood;
    }

    public String getWeatherSummary() {
        return weatherSummary;
    }

    public void setWeatherSummary(String weatherSummary) {
        this.weatherSummary = weatherSummary;
    }

    public String getTemperatureLabel() {
        return temperatureLabel;
    }

    public void setTemperatureLabel(String temperatureLabel) {
        this.temperatureLabel = temperatureLabel;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public boolean isFavorite() {
        return favorite;
    }

    public void setFavorite(boolean favorite) {
        this.favorite = favorite;
    }

    public boolean isShared() {
        return shared;
    }

    public void setShared(boolean shared) {
        this.shared = shared;
    }

    public OffsetDateTime getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(OffsetDateTime startedAt) {
        this.startedAt = startedAt;
    }

    public OffsetDateTime getFinishedAt() {
        return finishedAt;
    }

    public void setFinishedAt(OffsetDateTime finishedAt) {
        this.finishedAt = finishedAt;
    }

    public String getRoutePolylineJson() {
        return routePolylineJson;
    }

    public void setRoutePolylineJson(String routePolylineJson) {
        this.routePolylineJson = routePolylineJson;
    }

    public String getElevationSeriesJson() {
        return elevationSeriesJson;
    }

    public void setElevationSeriesJson(String elevationSeriesJson) {
        this.elevationSeriesJson = elevationSeriesJson;
    }

    public String getSessionExtrasJson() {
        return sessionExtrasJson;
    }

    public void setSessionExtrasJson(String sessionExtrasJson) {
        this.sessionExtrasJson = sessionExtrasJson;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
