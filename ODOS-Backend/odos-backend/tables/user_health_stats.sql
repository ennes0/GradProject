--
-- PostgreSQL database dump
--

\restrict fvmeAFrezSme6758iATyuuHJK8haF3WOY5aF3WzFup49FBVf3Um68xdZOBRAamS

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-16 18:52:02

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 231 (class 1259 OID 18681)
-- Name: user_health_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_health_stats (
    user_id uuid NOT NULL,
    total_steps bigint DEFAULT 0 NOT NULL,
    total_distance_m double precision DEFAULT 0 NOT NULL,
    total_calories double precision DEFAULT 0 NOT NULL,
    total_walk_minutes bigint DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_health_stats OWNER TO postgres;

--
-- TOC entry 5878 (class 0 OID 18681)
-- Dependencies: 231
-- Data for Name: user_health_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_health_stats (user_id, total_steps, total_distance_m, total_calories, total_walk_minutes, updated_at) FROM stdin;
d817701c-fe6f-4554-abf8-354f285e535b	0	0	0	0	2026-04-16 16:16:40.219971+03
b495eeda-4d43-44c4-bdc2-8477229d3bae	0	0	0	0	2026-04-16 18:03:41.189959+03
59ab85fe-83fd-4892-a8bf-e64c5388c758	0	0	0	0	2026-04-16 18:16:53.596528+03
\.


--
-- TOC entry 5724 (class 2606 OID 18696)
-- Name: user_health_stats user_health_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_health_stats
    ADD CONSTRAINT user_health_stats_pkey PRIMARY KEY (user_id);


--
-- TOC entry 5725 (class 2606 OID 18697)
-- Name: user_health_stats user_health_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_health_stats
    ADD CONSTRAINT user_health_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-04-16 18:52:02

--
-- PostgreSQL database dump complete
--

\unrestrict fvmeAFrezSme6758iATyuuHJK8haF3WOY5aF3WzFup49FBVf3Um68xdZOBRAamS

