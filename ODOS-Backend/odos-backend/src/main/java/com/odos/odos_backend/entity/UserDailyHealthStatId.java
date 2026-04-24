package com.odos.odos_backend.entity;

import java.io.Serializable;
import java.time.LocalDate;
import java.util.Objects;
import java.util.UUID;

/**
 * Bir kullanıcının belirli bir takvim günü için sağlık / aktivite özetinin birleşik anahtarı.
 */
public class UserDailyHealthStatId implements Serializable {

    private UUID userId;
    private LocalDate activityDate;

    public UserDailyHealthStatId() {
    }

    public UserDailyHealthStatId(UUID userId, LocalDate activityDate) {
        this.userId = userId;
        this.activityDate = activityDate;
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

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof UserDailyHealthStatId that)) {
            return false;
        }
        return Objects.equals(userId, that.userId) && Objects.equals(activityDate, that.activityDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(userId, activityDate);
    }
}
