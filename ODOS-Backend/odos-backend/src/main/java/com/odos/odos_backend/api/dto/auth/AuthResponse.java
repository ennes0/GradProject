package com.odos.odos_backend.api.dto.auth;

public record AuthResponse(
    String accessToken,
    String refreshToken,
    UserProfileResponse user
) {
}
