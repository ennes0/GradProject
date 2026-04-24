package com.odos.odos_backend.repository;

import java.util.Optional;
import java.util.UUID;
import java.util.List;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

import com.odos.odos_backend.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    @EntityGraph(attributePaths = "roles")
    Optional<User> findWithRolesByEmail(String email);
    Optional<User> findByUsername(String username);
    @EntityGraph(attributePaths = "roles")
    Optional<User> findWithRolesById(UUID id);
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);

    @Query("""
        select u from User u
        where u.isActive = true
          and u.id <> :viewerId
          and (
            :query = '' or
            lower(u.username) like lower(concat('%', :query, '%')) or
            lower(u.fullName) like lower(concat('%', :query, '%')) or
            lower(coalesce(u.city, '')) like lower(concat('%', :query, '%'))
          )
        order by u.fullName asc
        """)
    List<User> searchCommunityUsers(@Param("viewerId") UUID viewerId, @Param("query") String query, Pageable pageable);
}
