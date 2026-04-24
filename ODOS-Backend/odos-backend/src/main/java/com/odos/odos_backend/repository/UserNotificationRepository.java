package com.odos.odos_backend.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.odos.odos_backend.entity.UserNotification;

public interface UserNotificationRepository extends JpaRepository<UserNotification, UUID> {

    List<UserNotification> findByRecipientIdOrderByCreatedAtDesc(UUID recipientId, Pageable pageable);
}

