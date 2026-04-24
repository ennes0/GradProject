package com.odos.odos_backend.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.odos.odos_backend.api.dto.health.DailyHealthDayPayload;
import com.odos.odos_backend.api.dto.health.DailyHealthSyncResponse;
import com.odos.odos_backend.api.dto.health.SyncDailyHealthRequest;
import com.odos.odos_backend.entity.UserDailyHealthStat;
import com.odos.odos_backend.entity.UserDailyHealthStatId;
import com.odos.odos_backend.repository.UserDailyHealthStatRepository;

@Service
public class UserDailyHealthSyncService {

    private static final ZoneId TURKEY = ZoneId.of("Europe/Istanbul");
    private static final int MAX_PAST_DAYS = 13;

    private final UserDailyHealthStatRepository userDailyHealthStatRepository;

    public UserDailyHealthSyncService(UserDailyHealthStatRepository userDailyHealthStatRepository) {
        this.userDailyHealthStatRepository = userDailyHealthStatRepository;
    }

    @Transactional
    public DailyHealthSyncResponse sync(UUID userId, SyncDailyHealthRequest request) {
        LocalDate today = LocalDate.now(TURKEY);
        LocalDate oldest = today.minusDays(MAX_PAST_DAYS);
        int count = 0;
        for (DailyHealthDayPayload day : request.days()) {
            validateDay(day.date(), today, oldest);
            validateOptionalNumbers(day);
            upsert(userId, day);
            count++;
        }
        return new DailyHealthSyncResponse(count);
    }

    private static void validateDay(LocalDate date, LocalDate today, LocalDate oldest) {
        if (date.isAfter(today)) {
            throw new IllegalArgumentException("Gelecek tarihli aktivite kaydı kabul edilmez: " + date);
        }
        if (date.isBefore(oldest)) {
            throw new IllegalArgumentException("En fazla " + (MAX_PAST_DAYS + 1)
                + " günlük pencere destekleniyor. Tarih: " + date);
        }
    }

    private static void validateOptionalNumbers(DailyHealthDayPayload day) {
        if (day.distanceKm() != null && day.distanceKm() < 0) {
            throw new IllegalArgumentException("distanceKm negatif olamaz: " + day.date());
        }
        if (day.caloriesKcal() != null && day.caloriesKcal() < 0) {
            throw new IllegalArgumentException("caloriesKcal negatif olamaz: " + day.date());
        }
        if (day.walkMinutes() != null && day.walkMinutes() < 0) {
            throw new IllegalArgumentException("walkMinutes negatif olamaz: " + day.date());
        }
    }

    private void upsert(UUID userId, DailyHealthDayPayload day) {
        UserDailyHealthStatId id = new UserDailyHealthStatId(userId, day.date());
        UserDailyHealthStat row = userDailyHealthStatRepository.findById(id).orElseGet(() -> {
            UserDailyHealthStat e = new UserDailyHealthStat();
            e.setUserId(userId);
            e.setActivityDate(day.date());
            return e;
        });
        row.setSteps(day.steps());
        row.setDistanceM(distanceMeters(day));
        row.setCalories(calories(day));
        row.setWalkMinutes(walkMinutes(day));
        userDailyHealthStatRepository.save(row);
    }

    private static double distanceMeters(DailyHealthDayPayload day) {
        if (day.distanceKm() != null && day.distanceKm() >= 0) {
            return day.distanceKm() * 1000.0;
        }
        return Math.round(Math.max(0, day.steps()) * 0.78);
    }

    private static double calories(DailyHealthDayPayload day) {
        if (day.caloriesKcal() != null && day.caloriesKcal() >= 0) {
            return day.caloriesKcal();
        }
        return Math.round(Math.max(0, day.steps()) * 0.044 * 10.0) / 10.0;
    }

    private static long walkMinutes(DailyHealthDayPayload day) {
        if (day.walkMinutes() != null && day.walkMinutes() >= 0) {
            return day.walkMinutes();
        }
        return Math.max(0, Math.round((double) day.steps() / 100.0));
    }
}
