package com.odos.odos_backend.entity;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Kullanıcı başına tek satırlık ömür / özet istatistik (kayıt anında oluşturulur).
 * Günlük kırılım için {@link UserDailyHealthStat} tablosuna bakın.
 */
@Entity
@Table(name = "user_health_stats")
public class UserHealthStats {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @OneToOne
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "total_steps", nullable = false)
    private long totalSteps;

    @Column(name = "total_distance_m", nullable = false)
    private double totalDistanceM;

    @Column(name = "total_calories", nullable = false)
    private double totalCalories;

    @Column(name = "total_walk_minutes", nullable = false)
    private long totalWalkMinutes;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    public UUID getUserId() {
        return userId;
    }

    public void setUser(User user) {
        this.user = user;
    }

    @PrePersist
    @PreUpdate
    public void touch() {
        updatedAt = OffsetDateTime.now();
    }
}
