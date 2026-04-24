--
-- PostgreSQL database dump
--

\restrict hGvruYvmjByOeF11zaASFaEEd3G1bWTNHFtsDbqexwgBv9gbYkCnT1ImZRwZzOy

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-16 18:52:21

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
-- TOC entry 228 (class 1259 OID 18623)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(150) NOT NULL,
    bio text,
    city character varying(150),
    profile_photo_url text,
    is_public boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    banner_photo_url text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5881 (class 0 OID 18623)
-- Dependencies: 228
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, username, password_hash, full_name, bio, city, profile_photo_url, is_public, is_active, created_at, updated_at, banner_photo_url) FROM stdin;
d817701c-fe6f-4554-abf8-354f285e535b	enes@odos.com	enes	$2a$10$q/wvrNAzXzPssVPPfAPp.uAzripVsN.RGPvtegDZ8/EF/.Diqj0SO	Enes karakulak	Ben enes yürürüm	İstanbul türkiye	file:///data/user/0/host.exp.exponent/cache/ImagePicker/1406a4be-8b70-45e8-a136-376395bcd72a.jpeg	t	t	2026-04-16 16:16:40.219971+03	2026-04-16 17:23:49.946717+03	file:///data/user/0/host.exp.exponent/cache/ImagePicker/b2cfd9b9-d040-4eb5-8ca8-36cfb2d0887c.jpeg
b495eeda-4d43-44c4-bdc2-8477229d3bae	berk@odos.com	berk	$2a$10$ZYWNqOA7OC8aOC9WHD5hsObo2XSIiPnrIj9Gjrxh1jUnvSmbsBVbC	Berk karakulak	\N	\N	\N	t	t	2026-04-16 18:03:41.155561+03	2026-04-16 18:03:41.155561+03	\N
59ab85fe-83fd-4892-a8bf-e64c5388c758	murat@odos.com	murat	$2a$10$65vZBXuNPPRGbMnS01mi2.zJoQElX7A/BnBuhVPDQUQvnl5iU2KUy	Murat karakulak	\N	\N	\N	t	t	2026-04-16 18:16:53.596528+03	2026-04-16 18:16:53.596528+03	\N
\.


--
-- TOC entry 5724 (class 2606 OID 18645)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 5726 (class 2606 OID 18643)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5728 (class 2606 OID 18647)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


-- Completed on 2026-04-16 18:52:21

--
-- PostgreSQL database dump complete
--

\unrestrict hGvruYvmjByOeF11zaASFaEEd3G1bWTNHFtsDbqexwgBv9gbYkCnT1ImZRwZzOy

