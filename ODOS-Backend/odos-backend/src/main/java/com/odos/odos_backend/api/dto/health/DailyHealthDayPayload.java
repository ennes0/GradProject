package com.odos.odos_backend.api.dto.health;

import java.time.LocalDate;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record DailyHealthDayPayload(
    @NotNull LocalDate date,
    @Min(0) @Max(500_000) long steps,
    Double distanceKm,
    Double caloriesKcal,
    Long walkMinutes
) {
}
