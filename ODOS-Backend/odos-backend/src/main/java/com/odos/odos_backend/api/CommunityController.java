package com.odos.odos_backend.api;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.odos.odos_backend.api.dto.community.CommunityFeedItemResponse;
import com.odos.odos_backend.api.dto.community.CommunityNotificationResponse;
import com.odos.odos_backend.api.dto.community.CommunityUserListItemResponse;
import com.odos.odos_backend.api.dto.community.CommunityUserResponse;
import com.odos.odos_backend.api.dto.community.FollowActionResponse;
import com.odos.odos_backend.api.dto.community.FollowRequestItemResponse;
import com.odos.odos_backend.api.dto.community.PopularRouteStoryResponse;
import com.odos.odos_backend.api.dto.community.PublicUserProfileResponse;
import com.odos.odos_backend.api.dto.savedroute.SavedRouteListItemResponse;
import com.odos.odos_backend.api.dto.savedroute.SavedRouteResponse;
import com.odos.odos_backend.service.CommunityService;
import com.odos.odos_backend.service.SavedRouteService;

@RestController
@RequestMapping("/api/community")
public class CommunityController {

    private final CommunityService communityService;
    private final SavedRouteService savedRouteService;

    public CommunityController(CommunityService communityService, SavedRouteService savedRouteService) {
        this.communityService = communityService;
        this.savedRouteService = savedRouteService;
    }

    @GetMapping("/users")
    public List<CommunityUserResponse> searchUsers(
        Authentication authentication,
        @RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "20") int limit
    ) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.searchUsers(viewerId, q, limit);
    }

    @PostMapping("/follow/{userId}")
    public FollowActionResponse follow(Authentication authentication, @PathVariable UUID userId) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.follow(viewerId, userId);
    }

    @DeleteMapping("/follow/{userId}")
    public FollowActionResponse unfollow(Authentication authentication, @PathVariable UUID userId) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.unfollow(viewerId, userId);
    }

    @GetMapping("/feed")
    public List<CommunityFeedItemResponse> followingFeed(
        Authentication authentication,
        @RequestParam(defaultValue = "30") int limit
    ) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.getFollowingFeed(viewerId, limit);
    }

    @GetMapping("/users/{userId}/profile")
    public PublicUserProfileResponse publicProfile(Authentication authentication, @PathVariable UUID userId) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.getPublicProfile(viewerId, userId);
    }

    @GetMapping("/users/{userId}/followers")
    public List<CommunityUserListItemResponse> followers(
        Authentication authentication,
        @PathVariable UUID userId,
        @RequestParam(defaultValue = "50") int limit
    ) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.listFollowers(viewerId, userId, limit);
    }

    @GetMapping("/users/{userId}/following")
    public List<CommunityUserListItemResponse> following(
        Authentication authentication,
        @PathVariable UUID userId,
        @RequestParam(defaultValue = "50") int limit
    ) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.listFollowing(viewerId, userId, limit);
    }

    @GetMapping("/users/{userId}/routes")
    public List<SavedRouteListItemResponse> userRoutes(
        Authentication authentication,
        @PathVariable UUID userId,
        @RequestParam(defaultValue = "40") int limit
    ) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.listVisibleRoutes(viewerId, userId, limit);
    }

    @GetMapping("/routes/{routeId}/preview")
    public SavedRouteResponse routePreview(Authentication authentication, @PathVariable UUID routeId) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return savedRouteService.getSharedCommunityPreview(viewerId, routeId);
    }

    @GetMapping("/follow-requests/incoming")
    public List<FollowRequestItemResponse> incomingFollowRequests(
        Authentication authentication,
        @RequestParam(defaultValue = "50") int limit
    ) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.listIncomingFollowRequests(viewerId, limit);
    }

    @PostMapping("/follow-requests/{requestId}/accept")
    public FollowActionResponse acceptFollowRequest(Authentication authentication, @PathVariable UUID requestId) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.acceptFollowRequest(viewerId, requestId);
    }

    @PostMapping("/follow-requests/{requestId}/reject")
    public FollowActionResponse rejectFollowRequest(Authentication authentication, @PathVariable UUID requestId) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.rejectFollowRequest(viewerId, requestId);
    }

    @GetMapping("/notifications")
    public List<CommunityNotificationResponse> notifications(
        Authentication authentication,
        @RequestParam(defaultValue = "80") int limit
    ) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.listNotifications(viewerId, limit);
    }

    @GetMapping("/stories/popular-routes")
    public List<PopularRouteStoryResponse> popularRouteStories(
        Authentication authentication,
        @RequestParam(defaultValue = "12") int limit
    ) {
        UUID viewerId = UUID.fromString(authentication.getName());
        return communityService.listPopularRouteStories(viewerId, limit);
    }
}
