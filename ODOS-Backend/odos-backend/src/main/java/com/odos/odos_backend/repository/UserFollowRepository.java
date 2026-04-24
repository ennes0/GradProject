package com.odos.odos_backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.odos.odos_backend.entity.UserFollow;
import com.odos.odos_backend.entity.UserFollow.UserFollowId;

public interface UserFollowRepository extends JpaRepository<UserFollow, UserFollowId> {

    boolean existsById(UserFollowId id);

    void deleteById(UserFollowId id);

    long countByIdFollowedId(UUID followedId);

    long countByIdFollowerId(UUID followerId);

    @Query("select uf.id.followedId from UserFollow uf where uf.id.followerId = :followerId")
    List<UUID> findFollowedIdsByFollowerId(@Param("followerId") UUID followerId);

    @Query("select uf.id.followedId from UserFollow uf where uf.id.followerId = :followerId and uf.id.followedId in :targets")
    List<UUID> findFollowedIdsIn(@Param("followerId") UUID followerId, @Param("targets") List<UUID> targets);

    List<UserFollow> findByIdFollowedIdOrderByCreatedAtDesc(UUID followedId, Pageable pageable);

    List<UserFollow> findByIdFollowerIdOrderByCreatedAtDesc(UUID followerId, Pageable pageable);
}
