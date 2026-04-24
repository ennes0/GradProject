package com.odos.odos_backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.odos.odos_backend.entity.FollowRequest;

public interface FollowRequestRepository extends JpaRepository<FollowRequest, UUID> {

    Optional<FollowRequest> findByFollowerIdAndFollowedId(UUID followerId, UUID followedId);

    boolean existsByFollowerIdAndFollowedIdAndStatus(UUID followerId, UUID followedId, String status);

    List<FollowRequest> findByFollowedIdAndStatusOrderByCreatedAtDesc(UUID followedId, String status, Pageable pageable);
}

