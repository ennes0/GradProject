package com.odos.odos_backend.entity;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_follows")
public class UserFollow {

    @EmbeddedId
    private UserFollowId id;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public UserFollowId getId() {
        return id;
    }

    public void setId(UserFollowId id) {
        this.id = id;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    @PrePersist
    public void onCreate() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    public static UserFollow of(UUID followerId, UUID followedId) {
        UserFollow follow = new UserFollow();
        follow.setId(new UserFollowId(followerId, followedId));
        return follow;
    }

    public UUID getFollowerId() {
        return id == null ? null : id.followerId;
    }

    public UUID getFollowedId() {
        return id == null ? null : id.followedId;
    }

    @jakarta.persistence.Embeddable
    public static class UserFollowId implements Serializable {
        @Column(name = "follower_id", nullable = false)
        private UUID followerId;

        @Column(name = "followed_id", nullable = false)
        private UUID followedId;

        public UserFollowId() {
        }

        public UserFollowId(UUID followerId, UUID followedId) {
            this.followerId = followerId;
            this.followedId = followedId;
        }

        public UUID getFollowerId() {
            return followerId;
        }

        public UUID getFollowedId() {
            return followedId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            UserFollowId that = (UserFollowId) o;
            return Objects.equals(followerId, that.followerId) && Objects.equals(followedId, that.followedId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(followerId, followedId);
        }
    }
}
