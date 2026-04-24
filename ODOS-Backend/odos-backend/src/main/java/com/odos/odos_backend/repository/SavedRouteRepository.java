package com.odos.odos_backend.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.odos.odos_backend.entity.SavedRoute;

public interface SavedRouteRepository extends JpaRepository<SavedRoute, UUID> {

    List<SavedRoute> findByUserIdOrderByFinishedAtDesc(UUID userId, Pageable pageable);

    List<SavedRoute> findByUserIdAndSharedTrueOrderByFinishedAtDesc(UUID userId, Pageable pageable);

    List<SavedRoute> findByUserIdInAndSharedTrueOrderByFinishedAtDesc(List<UUID> userIds, Pageable pageable);

        @Query("""
                select sr
                from SavedRoute sr
                join User u on u.id = sr.userId
                where sr.shared = true
                    and u.isActive = true
                    and u.isPublic = true
                order by sr.favorite desc,
                                 coalesce(sr.traveledDistanceM, 0) desc,
                                 coalesce(sr.elapsedSeconds, 0) desc,
                                 sr.finishedAt desc
                """)
        List<SavedRoute> findPopularSharedRoutes(Pageable pageable);

    Optional<SavedRoute> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    long countByUserIdAndCompletionStatus(UUID userId, String completionStatus);

    long countByUserIdAndSharedTrue(UUID userId);
}
