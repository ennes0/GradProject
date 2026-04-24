package com.odos.odos_backend.api.dto.savedroute;

import com.fasterxml.jackson.annotation.JsonAlias;

public record CoordDto(
    @JsonAlias("latitude") Double lat,
    @JsonAlias("longitude") Double lon
) {
}
