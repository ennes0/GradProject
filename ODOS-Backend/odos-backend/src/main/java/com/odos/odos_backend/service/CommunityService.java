package com.odos.odos_backend.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.odos.odos_backend.api.dto.community.CommunityFeedItemResponse;
import com.odos.odos_backend.api.dto.community.CommunityNotificationResponse;
import com.odos.odos_backend.api.dto.community.PopularRouteStoryResponse;
import com.odos.odos_backend.api.dto.community.FollowActionResponse;
import com.odos.odos_backend.api.dto.community.FollowRequestItemResponse;
import com.odos.odos_backend.api.dto.community.CommunityUserListItemResponse;
import com.odos.odos_backend.api.dto.community.CommunityUserResponse;
import com.odos.odos_backend.api.dto.community.PublicUserProfileResponse;
import com.odos.odos_backend.api.dto.savedroute.SavedRouteListItemResponse;
import com.odos.odos_backend.entity.FollowRequest;
import com.odos.odos_backend.entity.SavedRoute;
import com.odos.odos_backend.entity.User;
import com.odos.odos_backend.entity.UserFollow;
import com.odos.odos_backend.entity.UserFollow.UserFollowId;
import com.odos.odos_backend.entity.UserNotification;
import com.odos.odos_backend.repository.FollowRequestRepository;
import com.odos.odos_backend.repository.SavedRouteRepository;
import com.odos.odos_backend.repository.UserNotificationRepository;
import com.odos.odos_backend.repository.UserFollowRepository;
import com.odos.odos_backend.repository.UserRepository;

@Service
public class CommunityService {

    private final UserRepository userRepository;
    private final UserFollowRepository userFollowRepository;
    private final SavedRouteRepository savedRouteRepository;
    private final FollowRequestRepository followRequestRepository;
    private final UserNotificationRepository userNotificationRepository;

    public CommunityService(
        UserRepository userRepository,
        UserFollowRepository userFollowRepository,
        SavedRouteRepository savedRouteRepository,
        FollowRequestRepository followRequestRepository,
        UserNotificationRepository userNotificationRepository
    ) {
        this.userRepository = userRepository;
        this.userFollowRepository = userFollowRepository;
        this.savedRouteRepository = savedRouteRepository;
        this.followRequestRepository = followRequestRepository;
        this.userNotificationRepository = userNotificationRepository;
    }

    @Transactional(readOnly = true)
    public List<CommunityUserResponse> searchUsers(UUID viewerId, String query, int limit) {
        int safeLimit = Math.min(100, Math.max(1, limit));
        String safeQuery = query == null ? "" : query.trim();
        List<User> users = userRepository.searchCommunityUsers(viewerId, safeQuery, PageRequest.of(0, safeLimit));
        if (users.isEmpty()) {
            return List.of();
        }
        List<UUID> userIds = users.stream().map(User::getId).toList();
        Set<UUID> followingSet = userFollowRepository.findFollowedIdsIn(viewerId, userIds).stream().collect(Collectors.toSet());
        Set<UUID> requestedSet = userIds.stream()
            .filter(id -> followRequestRepository.existsByFollowerIdAndFollowedIdAndStatus(viewerId, id, "pending"))
            .collect(Collectors.toSet());

        return users.stream().map(u -> new CommunityUserResponse(
            u.getId(),
            u.getUsername(),
            u.getFullName(),
            u.getCity(),
            u.getBio(),
            u.getProfilePhotoUrl(),
            savedRouteRepository.countByUserId(u.getId()),
            userFollowRepository.countByIdFollowedId(u.getId()),
            userFollowRepository.countByIdFollowerId(u.getId()),
            followingSet.contains(u.getId()),
            requestedSet.contains(u.getId())
        )).toList();
    }

    @Transactional(readOnly = true)
    public PublicUserProfileResponse getPublicProfile(UUID viewerId, UUID targetUserId) {
        User u = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı"));
        if (!u.isActive()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı");
        }
        boolean self = viewerId.equals(targetUserId);
        boolean follows = userFollowRepository.existsById(new UserFollowId(viewerId, targetUserId));
        boolean requested = followRequestRepository.existsByFollowerIdAndFollowedIdAndStatus(viewerId, targetUserId, "pending");
        long followers = userFollowRepository.countByIdFollowedId(targetUserId);
        long following = userFollowRepository.countByIdFollowerId(targetUserId);
        long routesShared = savedRouteRepository.countByUserId(targetUserId);

        boolean hidden = !u.isPublic() && !self && !follows;
        if (hidden) {
            return new PublicUserProfileResponse(
                u.getId(),
                u.getUsername(),
                u.getFullName(),
                null,
                null,
                u.getProfilePhotoUrl(),
                u.getBannerPhotoUrl(),
                u.isPublic(),
                routesShared,
                followers,
                following,
                follows,
                requested,
                self,
                true
            );
        }
        return new PublicUserProfileResponse(
            u.getId(),
            u.getUsername(),
            u.getFullName(),
            u.getBio(),
            u.getCity(),
            u.getProfilePhotoUrl(),
            u.getBannerPhotoUrl(),
            u.isPublic(),
            routesShared,
            followers,
            following,
            follows,
            requested,
            self,
            false
        );
    }

    @Transactional(readOnly = true)
    public List<SavedRouteListItemResponse> listVisibleRoutes(UUID viewerId, UUID targetUserId, int limit) {
        User u = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı"));
        if (!u.isActive()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı");
        }
        boolean self = viewerId.equals(targetUserId);
        boolean follows = userFollowRepository.existsById(new UserFollowId(viewerId, targetUserId));
        if (!u.isPublic() && !self && !follows) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu rotaları görüntüleme yetkiniz yok");
        }
        int safe = Math.min(100, Math.max(1, limit));
        return savedRouteRepository.findByUserIdOrderByFinishedAtDesc(targetUserId, PageRequest.of(0, safe))
            .stream()
            .map(this::toRouteListItem)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<CommunityUserListItemResponse> listFollowers(UUID viewerId, UUID targetUserId, int limit) {
        assertViewerCanViewSocialGraph(viewerId, targetUserId);
        int safe = Math.min(100, Math.max(1, limit));
        List<UserFollow> rows = userFollowRepository.findByIdFollowedIdOrderByCreatedAtDesc(
            targetUserId,
            PageRequest.of(0, safe)
        );
        return mapFollowRowsToItems(rows, true);
    }

    @Transactional(readOnly = true)
    public List<CommunityUserListItemResponse> listFollowing(UUID viewerId, UUID targetUserId, int limit) {
        assertViewerCanViewSocialGraph(viewerId, targetUserId);
        int safe = Math.min(100, Math.max(1, limit));
        List<UserFollow> rows = userFollowRepository.findByIdFollowerIdOrderByCreatedAtDesc(
            targetUserId,
            PageRequest.of(0, safe)
        );
        return mapFollowRowsToItems(rows, false);
    }

    /**
     * Gizli profillerde takipçi / takip listesi yalnızca kendisi veya onu takip edenlere açık.
     */
    private void assertViewerCanViewSocialGraph(UUID viewerId, UUID targetUserId) {
        if (viewerId.equals(targetUserId)) {
            return;
        }
        User u = userRepository.findById(targetUserId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı"));
        if (!u.isActive()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı");
        }
        if (u.isPublic()) {
            return;
        }
        boolean follows = userFollowRepository.existsById(new UserFollowId(viewerId, targetUserId));
        if (!follows) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu listeyi görüntüleme yetkiniz yok");
        }
    }

    private List<CommunityUserListItemResponse> mapFollowRowsToItems(List<UserFollow> rows, boolean followerSide) {
        if (rows == null || rows.isEmpty()) {
            return List.of();
        }
        List<UUID> ids = new ArrayList<>(rows.size());
        for (UserFollow row : rows) {
            UUID id = followerSide ? row.getFollowerId() : row.getFollowedId();
            if (id != null) {
                ids.add(id);
            }
        }
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<UUID, User> byId = userRepository.findAllById(ids).stream()
            .collect(Collectors.toMap(User::getId, x -> x));
        return ids.stream()
            .map(id -> {
                User u = byId.get(id);
                if (u == null || !u.isActive()) {
                    return null;
                }
                return new CommunityUserListItemResponse(
                    u.getId(),
                    u.getUsername(),
                    u.getFullName(),
                    u.getProfilePhotoUrl(),
                    u.getCity()
                );
            })
            .filter(Objects::nonNull)
            .toList();
    }

    @Transactional
    public FollowActionResponse follow(UUID followerId, UUID followedId) {
        if (followerId.equals(followedId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Kullanıcı kendini takip edemez");
        }
        User followed = userRepository.findById(followedId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Kullanıcı bulunamadı"));
        UserFollowId id = new UserFollowId(followerId, followedId);
        if (!userFollowRepository.existsById(id)) {
            if (followed.isPublic()) {
                userFollowRepository.save(UserFollow.of(followerId, followedId));
                createNotification(followedId, followerId, "followed", followedId);
                return new FollowActionResponse("followed", "Takip edildi");
            }
            FollowRequest req = followRequestRepository.findByFollowerIdAndFollowedId(followerId, followedId)
                .orElseGet(() -> {
                    FollowRequest r = new FollowRequest();
                    r.setFollowerId(followerId);
                    r.setFollowedId(followedId);
                    return r;
                });
            // Yeni istekte veya daha önce yanıtlanmış isteğin yeniden gönderiminde pending'e çekip kaydet.
            if ("pending".equals(req.getStatus())) {
                // Var olan bekleyen isteği tekrar üretme.
                if (req.getId() != null) {
                    return new FollowActionResponse("request_pending", "Takip isteği zaten beklemede");
                }
            }
            req.setStatus("pending");
            req.setRespondedAt(null);
            FollowRequest savedReq = followRequestRepository.save(req);
            createNotification(followedId, followerId, "follow_request_received", savedReq.getId());
            return new FollowActionResponse("request_sent", "Takip isteği gönderildi");
        }
        return new FollowActionResponse("already_following", "Zaten takiptesiniz");
    }

    @Transactional
    public FollowActionResponse unfollow(UUID followerId, UUID followedId) {
        userFollowRepository.deleteById(new UserFollowId(followerId, followedId));
        FollowRequest req = followRequestRepository.findByFollowerIdAndFollowedId(followerId, followedId).orElse(null);
        if (req != null && "pending".equals(req.getStatus())) {
            req.setStatus("cancelled");
            req.setRespondedAt(java.time.OffsetDateTime.now());
            followRequestRepository.save(req);
            return new FollowActionResponse("request_cancelled", "Takip isteği iptal edildi");
        }
        return new FollowActionResponse("unfollowed", "Takipten çıkıldı");
    }

    @Transactional(readOnly = true)
    public List<FollowRequestItemResponse> listIncomingFollowRequests(UUID viewerId, int limit) {
        int safeLimit = Math.min(100, Math.max(1, limit));
        List<FollowRequest> rows = followRequestRepository.findByFollowedIdAndStatusOrderByCreatedAtDesc(
            viewerId,
            "pending",
            PageRequest.of(0, safeLimit)
        );
        if (rows.isEmpty()) {
            return List.of();
        }
        List<UUID> followerIds = rows.stream().map(FollowRequest::getFollowerId).toList();
        Map<UUID, User> usersById = userRepository.findAllById(followerIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));
        return rows.stream()
            .map(r -> {
                User u = usersById.get(r.getFollowerId());
                if (u == null || !u.isActive()) {
                    return null;
                }
                return new FollowRequestItemResponse(
                    r.getId(),
                    u.getId(),
                    u.getUsername(),
                    u.getFullName(),
                    u.getProfilePhotoUrl(),
                    u.getCity(),
                    r.getCreatedAt()
                );
            })
            .filter(Objects::nonNull)
            .toList();
    }

    @Transactional
    public FollowActionResponse acceptFollowRequest(UUID viewerId, UUID requestId) {
        FollowRequest req = followRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Takip isteği bulunamadı"));
        if (!viewerId.equals(req.getFollowedId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu isteği yanıtlayamazsınız");
        }
        if (!"pending".equals(req.getStatus())) {
            return new FollowActionResponse("request_not_pending", "İstek artık beklemede değil");
        }
        req.setStatus("accepted");
        req.setRespondedAt(java.time.OffsetDateTime.now());
        followRequestRepository.save(req);
        UserFollowId followId = new UserFollowId(req.getFollowerId(), req.getFollowedId());
        if (!userFollowRepository.existsById(followId)) {
            userFollowRepository.save(UserFollow.of(req.getFollowerId(), req.getFollowedId()));
        }
        createNotification(req.getFollowerId(), viewerId, "follow_request_accepted", req.getId());
        return new FollowActionResponse("request_accepted", "Takip isteği kabul edildi");
    }

    @Transactional
    public FollowActionResponse rejectFollowRequest(UUID viewerId, UUID requestId) {
        FollowRequest req = followRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Takip isteği bulunamadı"));
        if (!viewerId.equals(req.getFollowedId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bu isteği yanıtlayamazsınız");
        }
        if (!"pending".equals(req.getStatus())) {
            return new FollowActionResponse("request_not_pending", "İstek artık beklemede değil");
        }
        req.setStatus("rejected");
        req.setRespondedAt(java.time.OffsetDateTime.now());
        followRequestRepository.save(req);
        createNotification(req.getFollowerId(), viewerId, "follow_request_rejected", req.getId());
        return new FollowActionResponse("request_rejected", "Takip isteği reddedildi");
    }

    @Transactional(readOnly = true)
    public List<CommunityNotificationResponse> listNotifications(UUID viewerId, int limit) {
        int safeLimit = Math.min(100, Math.max(1, limit));
        List<UserNotification> rows = userNotificationRepository.findByRecipientIdOrderByCreatedAtDesc(
            viewerId,
            PageRequest.of(0, safeLimit)
        );
        if (rows.isEmpty()) {
            return List.of();
        }
        List<UUID> actorIds = rows.stream()
            .map(UserNotification::getActorId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        Map<UUID, User> usersById = userRepository.findAllById(actorIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));
        return rows.stream().map(n -> {
            User actor = n.getActorId() == null ? null : usersById.get(n.getActorId());
            return new CommunityNotificationResponse(
                n.getId(),
                n.getType(),
                n.isRead(),
                n.getCreatedAt(),
                n.getActorId(),
                actor == null ? null : actor.getUsername(),
                actor == null ? null : actor.getFullName(),
                actor == null ? null : actor.getProfilePhotoUrl()
            );
        }).toList();
    }

    @Transactional(readOnly = true)
    public List<PopularRouteStoryResponse> listPopularRouteStories(UUID viewerId, int limit) {
        int safeLimit = Math.min(40, Math.max(1, limit));
        List<SavedRoute> routes = savedRouteRepository.findPopularSharedRoutes(PageRequest.of(0, safeLimit));
        if (routes.isEmpty()) {
            return List.of();
        }

        List<UUID> authorIds = routes.stream().map(SavedRoute::getUserId).distinct().toList();
        Map<UUID, User> usersById = userRepository.findAllById(authorIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        return routes.stream()
            .map(route -> {
                User author = usersById.get(route.getUserId());
                if (author == null || !author.isActive() || !author.isPublic()) {
                    return null;
                }
                return new PopularRouteStoryResponse(
                    route.getId(),
                    route.getTitle(),
                    route.getStartLabel(),
                    route.getEndLabel(),
                    route.getDifficulty(),
                    route.getTraveledDistanceM(),
                    route.getElapsedSeconds(),
                    route.getAvgSlopePct(),
                    route.getElevationGainM(),
                    route.getCaloriesKcal(),
                    route.getFinishedAt(),
                    route.getImageUrl(),
                    author.getId(),
                    author.getUsername(),
                    author.getFullName(),
                    author.getCity(),
                    author.getProfilePhotoUrl()
                );
            })
            .filter(Objects::nonNull)
            .toList();
    }

    private void createNotification(UUID recipientId, UUID actorId, String type, UUID entityId) {
        UserNotification n = new UserNotification();
        n.setRecipientId(recipientId);
        n.setActorId(actorId);
        n.setType(type);
        n.setEntityId(entityId);
        n.setRead(false);
        userNotificationRepository.save(n);
    }

    private SavedRouteListItemResponse toRouteListItem(SavedRoute e) {
        return new SavedRouteListItemResponse(
            e.getId(),
            e.getTitle(),
            e.getStartLabel(),
            e.getEndLabel(),
            e.getRouteType(),
            e.getDifficulty(),
            e.getCompletionStatus(),
            e.getCompletionRatio(),
            e.getPlannedDistanceM(),
            e.getTraveledDistanceM(),
            e.getElapsedSeconds(),
            e.getAvgSpeedKmh(),
            e.getPaceSecPerKm(),
            e.getCaloriesKcal(),
            e.getClimbM(),
            e.getRerouteCount(),
            e.getMaxOffRouteDistanceM(),
            e.getAvgSlopePct(),
            e.getMaxSlopePct(),
            e.getElevationGainM(),
            e.getSteps(),
            e.getMood(),
            e.getWeatherSummary(),
            e.getTemperatureLabel(),
            e.getNotes(),
            e.getImageUrl(),
            e.isFavorite(),
            e.getStartedAt(),
            e.getFinishedAt(),
            e.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<CommunityFeedItemResponse> getFollowingFeed(UUID viewerId, int limit) {
        int safeLimit = Math.min(120, Math.max(1, limit));
        List<UUID> followedIds = userFollowRepository.findFollowedIdsByFollowerId(viewerId);
        if (followedIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<SavedRoute> routes = savedRouteRepository.findByUserIdInAndSharedTrueOrderByFinishedAtDesc(
            followedIds,
            PageRequest.of(0, safeLimit)
        );
        if (routes.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> authorIds = routes.stream().map(SavedRoute::getUserId).distinct().toList();
        java.util.Map<UUID, User> usersById = userRepository.findAllById(authorIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        return routes.stream()
            .map(route -> {
                User author = usersById.get(route.getUserId());
                if (author == null) {
                    return null;
                }
                return new CommunityFeedItemResponse(
                    route.getId(),
                    route.getTitle(),
                    route.getStartLabel(),
                    route.getEndLabel(),
                    route.getRouteType(),
                    route.getDifficulty(),
                    route.getTraveledDistanceM(),
                    route.getClimbM(),
                    route.getCaloriesKcal(),
                    route.getFinishedAt(),
                    author.getId(),
                    author.getUsername(),
                    author.getFullName(),
                    author.getProfilePhotoUrl()
                );
            })
            .filter(java.util.Objects::nonNull)
            .toList();
    }
}
