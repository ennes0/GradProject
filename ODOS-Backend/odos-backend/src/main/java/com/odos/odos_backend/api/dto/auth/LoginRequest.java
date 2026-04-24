package com.odos.odos_backend.api.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
    @NotBlank String identifier,
    @NotBlank String password
) {
}
