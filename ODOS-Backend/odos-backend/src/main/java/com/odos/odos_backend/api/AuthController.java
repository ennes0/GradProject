package com.odos.odos_backend.api;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

import com.odos.odos_backend.api.dto.health.DailyHealthSyncResponse;
import com.odos.odos_backend.api.dto.health.SyncDailyHealthRequest;
import com.odos.odos_backend.api.dto.auth.AuthResponse;
import com.odos.odos_backend.api.dto.auth.LoginRequest;
import com.odos.odos_backend.api.dto.auth.RefreshRequest;
import com.odos.odos_backend.api.dto.auth.RegisterRequest;
import com.odos.odos_backend.api.dto.auth.UpdateProfileRequest;
import com.odos.odos_backend.api.dto.auth.UserProfileResponse;
import com.odos.odos_backend.auth.AuthService;
import com.odos.odos_backend.service.UserDailyHealthSyncService;

import jakarta.validation.Valid;

@Validated
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserDailyHealthSyncService userDailyHealthSyncService;

    public AuthController(AuthService authService, UserDailyHealthSyncService userDailyHealthSyncService) {
        this.authService = authService;
        this.userDailyHealthSyncService = userDailyHealthSyncService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshRequest request) {
        authService.logout(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> me(Authentication authentication) {
        return ResponseEntity.ok(authService.me(authentication));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserProfileResponse> updateMe(
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(authService.updateProfile(authentication, request));
    }

    @PutMapping("/me")
    public ResponseEntity<UserProfileResponse> replaceMe(
        Authentication authentication,
        @Valid @RequestBody UpdateProfileRequest request
    ) {
        return ResponseEntity.ok(authService.updateProfile(authentication, request));
    }

    @PostMapping(value = "/me/profile-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileResponse> uploadProfilePhoto(
        Authentication authentication,
        @RequestPart("file") MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Görsel dosyası gerekli");
        }
        return ResponseEntity.ok(authService.updateProfilePhoto(authentication, file));
    }

    @PostMapping(value = "/me/banner-photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UserProfileResponse> uploadBannerPhoto(
        Authentication authentication,
        @RequestPart("file") MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Görsel dosyası gerekli");
        }
        return ResponseEntity.ok(authService.updateBannerPhoto(authentication, file));
    }

    @PostMapping("/me/health/daily-sync")
    public ResponseEntity<DailyHealthSyncResponse> syncDailyHealth(
        Authentication authentication,
        @Valid @RequestBody SyncDailyHealthRequest request
    ) {
        UUID userId = UUID.fromString(authentication.getName());
        return ResponseEntity.ok(userDailyHealthSyncService.sync(userId, request));
    }
}
