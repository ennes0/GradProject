package com.odos.odos_backend.api.dto.savedroute;

import jakarta.validation.constraints.Size;

public record PatchSavedRouteRequest(
    Boolean favorite,
    @Size(max = 200) String title,
    @Size(max = 4000) String notes,
    @Size(max = 32) String mood
) {
}
