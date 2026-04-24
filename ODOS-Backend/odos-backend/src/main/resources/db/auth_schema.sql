CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    bio TEXT,
    city VARCHAR(150),
    profile_photo_url TEXT,
    banner_photo_url TEXT,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_name)
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS user_health_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_steps BIGINT NOT NULL DEFAULT 0,
    total_distance_m DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_calories DOUBLE PRECISION NOT NULL DEFAULT 0,
    total_walk_minutes BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_daily_health_stats (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL,
    steps BIGINT NOT NULL DEFAULT 0,
    distance_m DOUBLE PRECISION NOT NULL DEFAULT 0,
    calories DOUBLE PRECISION NOT NULL DEFAULT 0,
    walk_minutes BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_health_user_date ON user_daily_health_stats (user_id, activity_date DESC);

CREATE TABLE IF NOT EXISTS saved_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    start_label VARCHAR(400),
    end_label VARCHAR(400),
    route_type VARCHAR(32),
    difficulty VARCHAR(16),
    completion_status VARCHAR(32) NOT NULL DEFAULT 'completed',
    completion_ratio DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    planned_distance_m DOUBLE PRECISION,
    traveled_distance_m DOUBLE PRECISION,
    elapsed_seconds INTEGER NOT NULL DEFAULT 0,
    avg_speed_kmh DOUBLE PRECISION,
    pace_sec_per_km DOUBLE PRECISION,
    calories_kcal INTEGER,
    climb_m INTEGER,
    reroute_count INTEGER NOT NULL DEFAULT 0,
    max_off_route_distance_m DOUBLE PRECISION NOT NULL DEFAULT 0,
    avg_slope_pct DOUBLE PRECISION,
    max_slope_pct DOUBLE PRECISION,
    elevation_gain_m DOUBLE PRECISION,
    steps INTEGER,
    mood VARCHAR(32),
    weather_summary VARCHAR(120),
    temperature_label VARCHAR(32),
    notes TEXT,
    image_url TEXT,
    is_shared BOOLEAN NOT NULL DEFAULT TRUE,
    is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    route_polyline_json JSONB,
    elevation_series_json JSONB,
    session_extras_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user_finished ON saved_routes (user_id, finished_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_routes_user_favorite ON saved_routes (user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_saved_routes_shared_finished ON saved_routes (is_shared, finished_at DESC) WHERE is_shared = TRUE;

CREATE TABLE IF NOT EXISTS user_follows (
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows (follower_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_followed ON user_follows (followed_id, created_at DESC);

CREATE TABLE IF NOT EXISTS follow_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE (follower_id, followed_id),
    CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS idx_follow_requests_followed_status ON follow_requests (followed_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follow_requests_follower_status ON follow_requests (follower_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(40) NOT NULL,
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_recipient_created ON user_notifications (recipient_id, created_at DESC);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) NOT NULL DEFAULT 'en';

ALTER TABLE saved_routes
    ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT TRUE;
