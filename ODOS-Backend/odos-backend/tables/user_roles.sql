--
-- PostgreSQL database dump
--

\restrict c8TaQuQDV3eY9ui5n1onQJXKcEFgUUJSAOQsaWx8K7kr0fje4a0tU5iwkDcHVvc

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-04-16 18:49:37

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
-- TOC entry 229 (class 1259 OID 18648)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id uuid NOT NULL,
    role_name character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- TOC entry 5874 (class 0 OID 18648)
-- Dependencies: 229
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_roles (user_id, role_name, created_at) FROM stdin;
d817701c-fe6f-4554-abf8-354f285e535b	USER	2026-04-16 16:16:40.219971+03
b495eeda-4d43-44c4-bdc2-8477229d3bae	USER	2026-04-16 18:03:41.188957+03
59ab85fe-83fd-4892-a8bf-e64c5388c758	USER	2026-04-16 18:16:53.596528+03
\.


--
-- TOC entry 5720 (class 2606 OID 18656)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_name);


--
-- TOC entry 5721 (class 2606 OID 18657)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


-- Completed on 2026-04-16 18:49:37

--
-- PostgreSQL database dump complete
--

\unrestrict c8TaQuQDV3eY9ui5n1onQJXKcEFgUUJSAOQsaWx8K7kr0fje4a0tU5iwkDcHVvc

