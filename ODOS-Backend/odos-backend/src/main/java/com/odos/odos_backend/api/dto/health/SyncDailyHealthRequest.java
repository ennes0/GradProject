package com.odos.odos_backend.api.dto.health;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SyncDailyHealthRequest(
    @NotNull @Size(min = 1, max = 7) @Valid List<DailyHealthDayPayload> days
) {
}
