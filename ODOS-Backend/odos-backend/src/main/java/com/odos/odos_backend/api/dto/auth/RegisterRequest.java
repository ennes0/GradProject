package com.odos.odos_backend.api.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 3, max = 30) String username,
    @NotBlank
    @Size(min = 8, max = 120)
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
        message = "şifre en az bir büyük harf, bir küçük harf ve bir sayı içermelidir"
    )
    String password,
    @NotBlank @Size(max = 150) String fullName,
    @Pattern(regexp = "^(tr|en)?$", message = "preferredLanguage sadece tr veya en olabilir")
    String preferredLanguage
) {
}
