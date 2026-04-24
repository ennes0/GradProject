package com.odos.odos_backend.entity;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Kullanıcı başına takvim günü bazlı aktivite özeti (upsert).
 * Ömür boyu özet {@link UserHealthStats} tablosunda ayrı tutulmaya devam eder.
 */
@Entity
@Table(name = "user_daily_health_stats")
@IdClass(UserDailyHealthStatId.class)
public class UserDailyHealthStat {

    @Id
    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Id
    @Column(name = "activity_date", nullable = false)
    private LocalDate activityDate;

    @Column(name = "steps", nullable = false)
    private long steps;

    @Column(name = "distance_m", nullable = false)
    private double distanceM;

    @Column(name = "calories", nullable = false)
    private double calories;

    @Column(name = "walk_minutes", nullable = false)
    private long walkMinutes;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public LocalDate getActivityDate() {
        return activityDate;
    }

    public void setActivityDate(LocalDate activityDate) {
        this.activityDate = activityDate;
    }

    public long getSteps() {
        return steps;
    }

    public void setSteps(long steps) {
        this.steps = steps;
    }

    public double getDistanceM() {
        return distanceM;
    }

    public void setDistanceM(double distanceM) {
        this.distanceM = distanceM;
    }

    public double getCalories() {
        return calories;
    }

    public void setCalories(double calories) {
        this.calories = calories;
    }

    public long getWalkMinutes() {
        return walkMinutes;
    }

    public void setWalkMinutes(long walkMinutes) {
        this.walkMinutes = walkMinutes;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(OffsetDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
