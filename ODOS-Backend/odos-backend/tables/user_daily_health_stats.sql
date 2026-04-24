-- Günlük aktivite (kullanıcı + takvim günü). Mevcut DB'ye ekle:
CREATE TABLE IF NOT EXISTS public.user_daily_health_stats (
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_date date NOT NULL,
    steps bigint NOT NULL DEFAULT 0,
    distance_m double precision NOT NULL DEFAULT 0,
    calories double precision NOT NULL DEFAULT 0,
    walk_minutes bigint NOT NULL DEFAULT 0,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_daily_health_stats_pkey PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_health_user_date
    ON public.user_daily_health_stats USING btree (user_id, activity_date DESC);
