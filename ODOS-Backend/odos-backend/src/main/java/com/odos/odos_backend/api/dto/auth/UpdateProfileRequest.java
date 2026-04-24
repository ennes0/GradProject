package com.odos.odos_backend.api.dto.auth;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;

public record UpdateProfileRequest(
    @Size(max = 150) String fullName,
    @Size(max = 500) String bio,
    @Size(max = 150) String city,
    String profilePhotoUrl,
    String bannerPhotoUrl,
    @Pattern(regexp = "^(tr|en)?$", message = "preferredLanguage sadece tr veya en olabilir")
    String preferredLanguage,
    Boolean isPublic
) {
}
