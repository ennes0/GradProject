--
-- PostgreSQL database dump
--

\restrict p1tMqUtazYUEHjqid5bv03ImWoJCh7VkfCFYls5uFLfCOdqel9tfJ2Bb51TyHVf

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-16 18:50:19

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
-- TOC entry 230 (class 1259 OID 18662)
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- TOC entry 5877 (class 0 OID 18662)
-- Dependencies: 230
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at) FROM stdin;
64aaef31-daae-4c26-a89d-f17a193c8238	d817701c-fe6f-4554-abf8-354f285e535b	d68667f837f9db9d41f80e38416a2baaec114ed103a3a5633f8e8b9010429de3	2026-04-30 16:16:40.26518+03	2026-04-16 16:21:23.042192+03	2026-04-16 16:16:40.26518+03
caa0dc79-775e-4e14-8414-2d44c800df7f	d817701c-fe6f-4554-abf8-354f285e535b	30292abdb7c515df07302f8c2fb3a0b917d5c6d7f7f0aaacec306f64375d4f4a	2026-04-30 16:21:23.092164+03	\N	2026-04-16 16:21:23.09417+03
a6b83aac-6bbd-4f71-94b6-a85fba9377c6	d817701c-fe6f-4554-abf8-354f285e535b	b1219098dca8d06052c35b7083626d5ed2343d72c1f73fcb626ac0f065842fb6	2026-04-30 16:27:28.076039+03	2026-04-16 16:30:15.660567+03	2026-04-16 16:27:28.078045+03
ba5afff1-6d7b-438b-92e3-28988a41c86a	d817701c-fe6f-4554-abf8-354f285e535b	a6ba754609ccbe64b2a93d056e534f38015a2d707470041c0bf0deef7827f7ca	2026-04-30 16:30:15.723528+03	2026-04-16 16:34:01.010087+03	2026-04-16 16:30:15.726531+03
b8a11354-7b35-4e9a-b643-3facb6b50f8b	d817701c-fe6f-4554-abf8-354f285e535b	4ac94b071149f175fdfe3a1b5538644470bf18e74c361836bde58c129dc7bc47	2026-04-30 16:34:01.076622+03	\N	2026-04-16 16:34:01.079991+03
353e41e1-f9e2-4f7c-80d6-a3e75d11e1a6	d817701c-fe6f-4554-abf8-354f285e535b	e9faa237cbcaf13659b5fd18569c420e43b28a767dad3c999b173529d48af08e	2026-04-30 16:42:28.951146+03	\N	2026-04-16 16:42:28.956159+03
11f70e26-3671-46b8-a194-2a43383664b8	d817701c-fe6f-4554-abf8-354f285e535b	0dd01a39caf2b2a7670e108e6eef898f8f51ebde3995dc3c93bd6631244230e4	2026-04-30 16:46:16.489406+03	\N	2026-04-16 16:46:16.494319+03
7ce2c4ff-4a64-4b62-80a5-f4545599a585	d817701c-fe6f-4554-abf8-354f285e535b	4225e208e2fc8d2f308452d7d23f9797f463a74f8b846ec46ec9739b05d547e4	2026-04-30 16:55:08.204035+03	\N	2026-04-16 16:55:08.205034+03
24b5c069-2a5a-4d0c-99f2-ad66db0586c9	d817701c-fe6f-4554-abf8-354f285e535b	b49262d583de18a2b2902fd8f6cc15042a820ab5d2e8e3fcfa6fa1233c056e88	2026-04-30 16:57:55.078676+03	\N	2026-04-16 16:57:55.078676+03
71920c89-1700-4b32-8a06-a6d9e94efcbd	d817701c-fe6f-4554-abf8-354f285e535b	c355989468f2df5c8a2e676b286e08b134b725d115c126d40d6e1a977c49b7e5	2026-04-30 17:02:15.496134+03	\N	2026-04-16 17:02:15.498675+03
57827461-b5ec-487f-865a-bf17f5b5cf99	d817701c-fe6f-4554-abf8-354f285e535b	0f464546a51a596f3ddad1fdfaaff81d925b8e0a637b9bbde41266959473ca2c	2026-04-30 17:08:06.485744+03	2026-04-16 17:42:36.950152+03	2026-04-16 17:08:06.488604+03
6f7466e8-9302-4efa-a99f-9398f0adc751	d817701c-fe6f-4554-abf8-354f285e535b	a54dbe20095cfd4fd888d24f97935709a99c3d76422068f381354827eb2f765c	2026-04-30 17:42:36.98613+03	\N	2026-04-16 17:42:36.987934+03
adaf59f9-39f9-4e2e-b397-2bcd9e54fab8	b495eeda-4d43-44c4-bdc2-8477229d3bae	4d0bf7261c6bd78c3cd9fefb319e43fc2a906bb430925be9aad82bcc1226d9a0	2026-04-30 18:03:41.304635+03	\N	2026-04-16 18:03:41.304635+03
ab759a19-247f-42f1-8022-b137cf781167	d817701c-fe6f-4554-abf8-354f285e535b	ce784af9d8ee1209aaaf78ec7bf842c8503f2f8fc48f2cc48e76ac6bf17b7508	2026-04-30 18:15:48.288584+03	\N	2026-04-16 18:15:48.288584+03
cf2742e1-8115-4c32-9a58-4bf1b980cd1c	59ab85fe-83fd-4892-a8bf-e64c5388c758	82b9585001de5e5fb019da32d06132768990843f86275daa657486a80e0435b4	2026-04-30 18:16:53.596528+03	\N	2026-04-16 18:16:53.596528+03
\.


--
-- TOC entry 5723 (class 2606 OID 18673)
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 5720 (class 1259 OID 18680)
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- TOC entry 5721 (class 1259 OID 18679)
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- TOC entry 5724 (class 2606 OID 18674)
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-04-16 18:50:20

--
-- PostgreSQL database dump complete
--

\unrestrict p1tMqUtazYUEHjqid5bv03ImWoJCh7VkfCFYls5uFLfCOdqel9tfJ2Bb51TyHVf

