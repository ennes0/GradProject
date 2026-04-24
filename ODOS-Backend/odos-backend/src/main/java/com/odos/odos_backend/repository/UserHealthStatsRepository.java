package com.odos.odos_backend.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.odos.odos_backend.entity.UserHealthStats;

public interface UserHealthStatsRepository extends JpaRepository<UserHealthStats, UUID> {
}
