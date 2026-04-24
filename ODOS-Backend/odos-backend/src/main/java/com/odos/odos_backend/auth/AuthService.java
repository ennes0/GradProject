package com.odos.odos_backend.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.odos.odos_backend.api.dto.auth.AuthResponse;
import com.odos.odos_backend.api.dto.auth.LoginRequest;
import com.odos.odos_backend.api.dto.auth.RefreshRequest;
import com.odos.odos_backend.api.dto.auth.RegisterRequest;
import com.odos.odos_backend.api.dto.auth.UpdateProfileRequest;
import com.odos.odos_backend.api.dto.auth.UserProfileResponse;
import com.odos.odos_backend.entity.RefreshToken;
import com.odos.odos_backend.entity.RoleName;
import com.odos.odos_backend.entity.User;
import com.odos.odos_backend.entity.UserHealthStats;
import com.odos.odos_backend.repository.RefreshTokenRepository;
import com.odos.odos_backend.repository.UserHealthStatsRepository;
import com.odos.odos_backend.repository.UserRepository;
import com.odos.odos_backend.security.JwtService;
import com.odos.odos_backend.media.UserMediaStorageService;

import io.jsonwebtoken.JwtException;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserHealthStatsRepository userHealthStatsRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserMediaStorageService userMediaStorageService;
    private final long refreshTokenDays;

    public AuthService(
        UserRepository userRepository,
        RefreshTokenRepository refreshTokenRepository,
        UserHealthStatsRepository userHealthStatsRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        UserMediaStorageService userMediaStorageService,
        @Value("${odos.jwt.refresh-token-days}") long refreshTokenDays
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.userHealthStatsRepository = userHealthStatsRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userMediaStorageService = userMediaStorageService;
        this.refreshTokenDays = refreshTokenDays;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();
        String username = request.username().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Bu e-posta adresi zaten kayıtlı");
        }
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Bu kullanıcı adı zaten kullanımda");
        }

        User user = new User();
        user.setEmail(email);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setPreferredLanguage(normalizeLanguage(request.preferredLanguage()));
        user.addRole(RoleName.USER);
        User savedUser = userRepository.save(user);

        UserHealthStats stats = new UserHealthStats();
        stats.setUser(savedUser);
        userHealthStatsRepository.save(stats);

        return issueTokens(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String identifier = request.identifier().trim().toLowerCase();
        User user = userRepository.findByEmail(identifier)
            .or(() -> userRepository.findByUsername(identifier))
            .orElseThrow(() -> new IllegalArgumentException("Kullanıcı adı/e-posta veya şifre hatalı"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Kullanıcı adı/e-posta veya şifre hatalı");
        }

        return issueTokens(user);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        try {
            if (!jwtService.isRefreshToken(request.refreshToken())) {
                throw new IllegalArgumentException("Geçersiz refresh token");
            }
        } catch (JwtException e) {
            throw new IllegalArgumentException("Geçersiz refresh token");
        }

        String tokenHash = hashToken(request.refreshToken());
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new IllegalArgumentException("Refresh token bulunamadı"));

        if (refreshToken.isRevoked() || refreshToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Refresh token süresi dolmuş");
        }

        refreshToken.setRevokedAt(OffsetDateTime.now());
        return issueTokens(refreshToken.getUser());
    }

    @Transactional
    public void logout(RefreshRequest request) {
        String tokenHash = hashToken(request.refreshToken());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.setRevokedAt(OffsetDateTime.now());
            refreshTokenRepository.save(token);
        });
    }

    @Transactional(readOnly = true)
    public UserProfileResponse me(Authentication authentication) {
        return toProfileResponse(getCurrentUser(authentication));
    }

    @Transactional
    public UserProfileResponse updateProfile(Authentication authentication, UpdateProfileRequest request) {
        User user = getCurrentUser(authentication);
        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }
        if (request.bio() != null) {
            user.setBio(request.bio().trim());
        }
        if (request.city() != null) {
            user.setCity(request.city().trim());
        }
        if (request.profilePhotoUrl() != null) {
            String u = stripToMediaPathIfPresent(request.profilePhotoUrl().trim());
            validateClientPhotoUrl(u, user.getId());
            user.setProfilePhotoUrl(u);
        }
        if (request.bannerPhotoUrl() != null) {
            String u = stripToMediaPathIfPresent(request.bannerPhotoUrl().trim());
            validateClientPhotoUrl(u, user.getId());
            user.setBannerPhotoUrl(u);
        }
        if (request.isPublic() != null) {
            user.setPublic(request.isPublic());
        }
        if (request.preferredLanguage() != null) {
            user.setPreferredLanguage(normalizeLanguage(request.preferredLanguage()));
        }
        return toProfileResponse(userRepository.save(user));
    }

    @Transactional
    public UserProfileResponse updateProfilePhoto(Authentication authentication, MultipartFile file) {
        User user = getCurrentUser(authentication);
        String previous = user.getProfilePhotoUrl();
        try {
            String newPath = userMediaStorageService.saveUserImage(user.getId(), file);
            user.setProfilePhotoUrl(newPath);
            User saved = userRepository.save(user);
            if (previous != null && !previous.equals(newPath)) {
                userMediaStorageService.deleteIfOwnedByUser(previous, user.getId());
            }
            return toProfileResponse(saved);
        } catch (IOException e) {
            throw new IllegalStateException("Profil fotoğrafı kaydedilemedi", e);
        }
    }

    @Transactional
    public UserProfileResponse updateBannerPhoto(Authentication authentication, MultipartFile file) {
        User user = getCurrentUser(authentication);
        String previous = user.getBannerPhotoUrl();
        try {
            String newPath = userMediaStorageService.saveUserImage(user.getId(), file);
            user.setBannerPhotoUrl(newPath);
            User saved = userRepository.save(user);
            if (previous != null && !previous.equals(newPath)) {
                userMediaStorageService.deleteIfOwnedByUser(previous, user.getId());
            }
            return toProfileResponse(saved);
        } catch (IOException e) {
            throw new IllegalStateException("Banner fotoğrafı kaydedilemedi", e);
        }
    }

    private User getCurrentUser(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("Kullanıcı bulunamadı"));
    }

    private AuthResponse issueTokens(User user) {
        refreshTokenRepository.deleteByExpiresAtBefore(OffsetDateTime.now());

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshTokenValue = jwtService.generateRefreshToken(user.getId());

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setTokenHash(hashToken(refreshTokenValue));
        refreshToken.setExpiresAt(OffsetDateTime.now().plus(refreshTokenDays, ChronoUnit.DAYS));
        refreshTokenRepository.save(refreshToken);

        return new AuthResponse(accessToken, refreshTokenValue, toProfileResponse(user));
    }

    private static String stripToMediaPathIfPresent(String url) {
        int idx = url.indexOf("/api/media/users/");
        if (idx >= 0) {
            return url.substring(idx);
        }
        return url;
    }

    private void validateClientPhotoUrl(String url, UUID userId) {
        String lower = url.toLowerCase();
        if (lower.startsWith("file:") || lower.startsWith("content:")) {
            throw new IllegalArgumentException(
                "Yerel dosya yolu kabul edilmez. Fotoğrafı /api/auth/me/profile-photo veya /api/auth/me/banner-photo ile yükleyin.");
        }
        int idx = url.indexOf("/api/media/users/");
        if (idx >= 0) {
            String path = url.substring(idx);
            String expected = "/api/media/users/" + userId + "/";
            if (!path.startsWith(expected)) {
                throw new IllegalArgumentException("Geçersiz medya yolu");
            }
        }
    }

    private UserProfileResponse toProfileResponse(User user) {
        return new UserProfileResponse(
            user.getId(),
            user.getEmail(),
            user.getUsername(),
            user.getFullName(),
            user.getBio(),
            user.getCity(),
            user.getProfilePhotoUrl(),
            user.getBannerPhotoUrl(),
            user.getPreferredLanguage(),
            user.isPublic(),
            user.getCreatedAt()
        );
    }

    private static String normalizeLanguage(String value) {
        if (value == null) return "en";
        String lower = value.trim().toLowerCase();
        if (lower.startsWith("tr")) return "tr";
        if (lower.startsWith("en")) return "en";
        return "en";
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 desteklenmiyor", e);
        }
    }
}
