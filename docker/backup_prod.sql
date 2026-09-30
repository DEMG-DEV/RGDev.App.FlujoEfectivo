--
-- PostgreSQL database dump
--

\restrict eZtmQplpf8ae9e2JBDoyqi02mTQz5i1sy2D56oQkxQl7napamypa1fgBQSGCDuR

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

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

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tipo character varying(10) NOT NULL,
    nombre character varying(100) NOT NULL,
    descripcion text,
    icono character varying(50),
    color character varying(20),
    CONSTRAINT categorias_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['ingreso'::character varying, 'gasto'::character varying])::text[])))
);


--
-- Name: configuracion_sistema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.configuracion_sistema (
    clave character varying(100) NOT NULL,
    valor text NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: miembros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.miembros (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(150) NOT NULL,
    telefono character varying(30),
    email character varying(100),
    notas text,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pactos_miembros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pactos_miembros (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    proyecto_id uuid NOT NULL,
    miembro_nombre character varying(150) NOT NULL,
    miembro_telefono character varying(30),
    monto_total_pactado numeric(14,2) NOT NULL,
    cuota_semanal numeric(14,2) NOT NULL,
    fecha_inicio date DEFAULT CURRENT_DATE NOT NULL,
    estado character varying(20) DEFAULT 'al_dia'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pactos_miembros_estado_check CHECK (((estado)::text = ANY ((ARRAY['al_dia'::character varying, 'completado'::character varying, 'pendiente'::character varying])::text[])))
);


--
-- Name: proyectos_pactados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proyectos_pactados (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(150) NOT NULL,
    descripcion text,
    meta_total numeric(14,2) DEFAULT 0 NOT NULL,
    valor_semanal_sugerido numeric(14,2) DEFAULT 0 NOT NULL,
    fecha_inicio date DEFAULT CURRENT_DATE NOT NULL,
    fecha_fin date,
    color_acento character varying(20) DEFAULT '#4f46e5'::character varying,
    activo boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: transacciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transacciones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tipo character varying(10) NOT NULL,
    subtipo character varying(20),
    categoria character varying(100) NOT NULL,
    monto numeric(14,2) NOT NULL,
    fecha date NOT NULL,
    dia_semana character varying(15) NOT NULL,
    tipo_culto character varying(30) DEFAULT 'no_aplica'::character varying,
    concepto character varying(255) NOT NULL,
    miembro_id uuid,
    miembro_nombre character varying(150),
    proyecto_id uuid,
    pacto_id uuid,
    metodo_pago character varying(20) DEFAULT 'efectivo'::character varying NOT NULL,
    evidencia_url text,
    evidencia_nombre character varying(255),
    evidencia_tipo character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transacciones_dia_semana_check CHECK (((dia_semana)::text = ANY ((ARRAY['miercoles'::character varying, 'domingo'::character varying, 'otro'::character varying])::text[]))),
    CONSTRAINT transacciones_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['efectivo'::character varying, 'transferencia'::character varying, 'cheque'::character varying, 'tarjeta'::character varying])::text[]))),
    CONSTRAINT transacciones_monto_check CHECK ((monto > (0)::numeric)),
    CONSTRAINT transacciones_subtipo_check CHECK (((subtipo)::text = ANY ((ARRAY['ofrenda'::character varying, 'diezmo'::character varying, 'pacto'::character varying, 'otro_ingreso'::character varying, NULL::character varying])::text[]))),
    CONSTRAINT transacciones_tipo_check CHECK (((tipo)::text = ANY ((ARRAY['ingreso'::character varying, 'gasto'::character varying])::text[]))),
    CONSTRAINT transacciones_tipo_culto_check CHECK (((tipo_culto)::text = ANY ((ARRAY['miercoles_general'::character varying, 'domingo_manana'::character varying, 'domingo_tarde'::character varying, 'especial'::character varying, 'no_aplica'::character varying])::text[])))
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    nombre character varying(150) NOT NULL,
    rol character varying(50) DEFAULT 'tesorero'::character varying NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT usuarios_rol_check CHECK (((rol)::text = ANY ((ARRAY['admin'::character varying, 'pastor'::character varying, 'tesorero'::character varying, 'operador'::character varying])::text[])))
);


--
-- Data for Name: categorias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categorias (id, tipo, nombre, descripcion, icono, color) FROM stdin;
53f94195-9336-40e0-963d-bbed54fe06b4	ingreso	Diezmo General	\N	heart-handshake	#10b981
560c29d9-eecd-4e9d-bb9f-6f777504a286	ingreso	Ofrenda General	\N	coins	#059669
51290dc7-83c0-4718-a5fd-cb74317c4ae1	ingreso	Ofrenda Misionera	\N	globe	#0d9488
6248baaa-1d16-4dde-a7ee-86e4922eb37f	ingreso	Ofrenda Escuela Dominical / Niños	\N	baby	#14b8a6
796e47a4-c474-487e-9187-f5e183c75c52	ingreso	Aporte a Proyecto Pactado	\N	landmark	#6366f1
1502cb82-5b16-40b5-a83b-1253b5ecc828	ingreso	Donación Especial	\N	gift	#8b5cf6
0bb1a596-ff1e-4f06-a1e1-4f5591751e6f	gasto	Servicios Básicos (Luz, Agua, Gas)	\N	zap	#f59e0b
0b314bdf-ca00-4d3b-9a0d-d99de2e3c065	gasto	Internet y Telecomunicaciones	\N	wifi	#d97706
05c7ae1d-15a4-4daf-a8fb-967b1a1c553b	gasto	Mantenimiento del Templo	\N	hammer	#ef4444
c69f81bb-02c3-46e4-a783-bade7f540a73	gasto	Honorarios Pastorales / Viáticos	\N	user-check	#b91c1c
57ba2370-998e-417a-96fe-2b9e24f3cdb5	gasto	Sonido, Multimedia e Instrumentos	\N	music	#dc2626
40ec5059-69eb-4d72-8abf-8a23a9c03810	gasto	Obra Social y Misericordia	\N	heart	#ec4899
be642925-88e7-4f33-b7f6-43997354e07f	gasto	Material de Evangelismo y Discipulado	\N	book-open	#7c3aed
deeda6fe-5ab0-4e6d-b558-aacd7b8c03ec	gasto	Papelería y Administración	\N	file-text	#64748b
48238475-dbd0-426b-bce9-523c6f7a3566	gasto	Eventos y Retiros	\N	calendar	#0284c7
\.


--
-- Data for Name: configuracion_sistema; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.configuracion_sistema (clave, valor, updated_at) FROM stdin;
registro_habilitado	false	2026-09-29 15:54:24.258087+00
\.


--
-- Data for Name: miembros; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.miembros (id, nombre, telefono, email, notas, activo, created_at) FROM stdin;
\.


--
-- Data for Name: pactos_miembros; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.pactos_miembros (id, proyecto_id, miembro_nombre, miembro_telefono, monto_total_pactado, cuota_semanal, fecha_inicio, estado, created_at) FROM stdin;
847422a7-c069-4f3c-954e-63c93f78d025	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	David Mendez	\N	360.00	120.00	2026-09-29	al_dia	2026-09-29 16:48:08.271536+00
20d86d03-b193-4f1d-a97d-7dd25ea27ce9	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	Nancy Hernandez	\N	360.00	120.00	2026-09-29	al_dia	2026-09-29 16:48:33.373896+00
fca43232-acd9-4b33-9158-87c388e54470	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	Crystal	\N	360.00	120.00	2026-09-29	al_dia	2026-09-29 16:49:00.133917+00
37bc49d4-bce3-4566-b43c-6e629fa599fc	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	Juan	\N	360.00	120.00	2026-09-29	al_dia	2026-09-29 16:49:12.334396+00
2bc46b89-9db0-413d-b19d-f988fff0afd3	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	Ma de Jesus	\N	360.00	120.00	2026-09-29	al_dia	2026-09-29 16:49:23.850977+00
b12cffa0-6e82-4fa6-96d3-7f7b24bee934	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	Jesus Hernandez	\N	360.00	120.00	2026-09-29	al_dia	2026-09-29 16:52:19.422107+00
dc2f175e-f35d-40bf-a7c9-236265068b49	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	Laura Hernandez	\N	360.00	120.00	2026-09-29	al_dia	2026-09-29 16:52:30.873231+00
\.


--
-- Data for Name: proyectos_pactados; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.proyectos_pactados (id, nombre, descripcion, meta_total, valor_semanal_sugerido, fecha_inicio, fecha_fin, color_acento, activo, created_at) FROM stdin;
8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	Poder para Bocinas		2520.00	120.00	2026-09-29	\N	#4f46e5	t	2026-09-29 16:19:45.728086+00
\.


--
-- Data for Name: transacciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.transacciones (id, tipo, subtipo, categoria, monto, fecha, dia_semana, tipo_culto, concepto, miembro_id, miembro_nombre, proyecto_id, pacto_id, metodo_pago, evidencia_url, evidencia_nombre, evidencia_tipo, created_at) FROM stdin;
378000a4-dd6f-445e-a5f4-e45a04317605	ingreso	ofrenda	Ofrenda General	43.00	2026-09-27	domingo	domingo_manana	Ofrenda Culto Domingo	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 16:19:15.452+00
23456435-f614-42c1-a212-92382568e40b	ingreso	pacto	Aporte a Proyecto Pactado	120.00	2026-09-27	domingo	domingo_manana	Cuota semanal: Poder para Bocinas	\N	David Mendez	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	847422a7-c069-4f3c-954e-63c93f78d025	efectivo	\N	\N	\N	2026-09-29 16:48:14.914805+00
02f9d0f1-1103-49d7-94f3-ef35bf6f5857	ingreso	pacto	Aporte a Proyecto Pactado	120.00	2026-09-27	domingo	domingo_manana	Cuota semanal: Poder para Bocinas	\N	Nancy Hernandez	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	20d86d03-b193-4f1d-a97d-7dd25ea27ce9	efectivo	\N	\N	\N	2026-09-29 16:49:32.760136+00
7922e370-7921-45dc-a6ff-001619bb7a7c	ingreso	pacto	Aporte a Proyecto Pactado	120.00	2026-09-27	domingo	domingo_manana	Cuota semanal: Poder para Bocinas	\N	Crystal	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	fca43232-acd9-4b33-9158-87c388e54470	efectivo	\N	\N	\N	2026-09-29 16:49:40.6791+00
bcbb2651-2ee0-471c-a996-a908e1744475	ingreso	pacto	Aporte a Proyecto Pactado	120.00	2026-09-27	domingo	domingo_manana	Cuota semanal: Poder para Bocinas	\N	Juan	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	37bc49d4-bce3-4566-b43c-6e629fa599fc	efectivo	\N	\N	\N	2026-09-29 16:49:46.235636+00
75f21a06-d903-4652-8320-d5990ecfae80	ingreso	pacto	Aporte a Proyecto Pactado	120.00	2026-09-27	domingo	domingo_manana	Cuota semanal: Poder para Bocinas	\N	Ma de Jesus	8f3528a0-daec-4ab9-a6d9-13d0665c7a4f	2bc46b89-9db0-413d-b19d-f988fff0afd3	efectivo	\N	\N	\N	2026-09-29 16:49:50.104867+00
f173223f-670f-4158-a448-7a6ee3b8b191	ingreso	ofrenda	Ofrenda General	75.00	2026-08-09	domingo	domingo_manana	Ofrenda Culto Domingo Mañana	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:27:52.179629+00
f48c1a39-dd75-4f95-8807-99480cfb702e	ingreso	ofrenda	Ofrenda General	60.00	2026-08-16	domingo	domingo_manana	Ofrenda Culto Domingo Mañana	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:28:05.308271+00
77df7388-b4a6-479e-9e24-73b6fe65c173	ingreso	diezmo	Diezmo General	120.00	2026-08-16	domingo	domingo_manana	Diezmo de agradecimiento	\N	Crystal	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:28:51.411998+00
41686853-793f-49a5-bd12-00f723d409b6	ingreso	diezmo	Diezmo General	200.00	2026-08-16	domingo	domingo_manana	Diezmo de agradecimiento	\N	Jesus Hernandez	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:28:59.404578+00
65db9155-854f-48c9-aa6b-b5538db3e8c5	ingreso	ofrenda	Ofrenda General	70.00	2026-08-23	domingo	domingo_manana	Ofrenda Culto Domingo Mañana	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:29:13.138796+00
73b031f1-5f03-4259-aec3-178ced9ca146	ingreso	diezmo	Diezmo General	100.00	2026-08-30	domingo	domingo_manana	Diezmo de agradecimiento	\N	Crystal	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:29:35.566297+00
05a3d3d7-c7c7-4eee-a008-5128559133ed	ingreso	diezmo	Diezmo General	100.00	2026-08-30	domingo	domingo_manana	Diezmo de agradecimiento	\N	Jesus Hernandez	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:29:41.892646+00
8134707d-ab84-4944-a70e-c5c034dcf0e0	ingreso	ofrenda	Ofrenda General	89.00	2026-09-06	domingo	domingo_manana	Ofrenda Culto Domingo Mañana	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:34:11.519288+00
e0c4ba71-8eab-4572-ad72-d2a2db2bf0fd	ingreso	ofrenda	Ofrenda General	76.00	2026-09-13	domingo	domingo_manana	Ofrenda Culto Domingo Mañana	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:34:22.96718+00
a7dfe4b9-6c81-4ba6-b951-2ef9a1143180	ingreso	ofrenda	Ofrenda General	40.00	2026-09-16	miercoles	domingo_manana	Ofrenda Culto Domingo Mañana	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:34:31.259586+00
41c1ecaa-95f8-447e-bb48-3be500f398af	ingreso	ofrenda	Ofrenda General	95.00	2026-09-20	domingo	domingo_manana	Ofrenda Culto Domingo Mañana	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:34:38.75845+00
d5092db0-42b7-4e0e-9560-9b8d06676c2e	ingreso	ofrenda	Ofrenda General	20.00	2026-09-23	miercoles	domingo_manana	Ofrenda Culto Domingo Mañana	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:34:46.435534+00
53b287a3-5b2c-4311-9133-a836c2151a39	gasto	\N	Mantenimiento y Reparaciones del Templo	280.00	2026-09-23	miercoles	no_aplica	1 saco Cemento	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:36:33.750534+00
f10ae197-5c2d-4105-a5d5-3e0e5c184e5f	gasto	\N	Mantenimiento y Reparaciones del Templo	80.00	2026-09-20	domingo	no_aplica	Lata de pintura negra	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:36:14.783844+00
b4ce2bc9-9a3e-4807-b5d0-7ee061d80f8b	gasto	\N	Sonido, Multimedia e Instrumentos	450.00	2026-09-16	miercoles	no_aplica	Teclado	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:35:58.972849+00
05d52353-c960-48cd-b1e9-693675986826	gasto	\N	Mantenimiento y Reparaciones del Templo	200.00	2026-09-13	domingo	no_aplica	Cortinas	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:35:46.23334+00
271581ff-4bbb-41ca-a028-505b85668d41	gasto	\N	Mantenimiento y Reparaciones del Templo	280.00	2026-09-06	domingo	no_aplica	Lona con horarios	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:35:31.105002+00
a9e9ea76-e492-4e62-8142-8d24b9570453	gasto	\N	Papelería, Limpieza y Administración	70.00	2026-08-30	domingo	no_aplica	Manual de estudio para el pastor, 18 puntos doctrinales	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:33:12.713157+00
ea75eab0-3f17-4054-82a0-7846131ceaf0	gasto	\N	Mantenimiento y Reparaciones del Templo	250.00	2026-08-23	domingo	no_aplica	Lonas para sombra	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:31:35.740632+00
16416f90-10c2-4b83-8c68-c4178b5cf280	gasto	\N	Papelería, Limpieza y Administración	20.00	2026-08-16	domingo	no_aplica	Sobres	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:31:03.099754+00
7d11007f-cc27-4b6b-9079-77f0d1fb97cf	gasto	\N	Honorarios Pastorales / Viáticos	50.00	2026-08-16	domingo	no_aplica	Copias estudio	\N	\N	\N	\N	efectivo	\N	\N	\N	2026-09-29 17:30:30.041267+00
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, email, password_hash, nombre, rol, activo, created_at, updated_at) FROM stdin;
62fce108-4b76-446c-bbae-5a81bcd17baa	demg@outlook.com	$2b$10$JRPUXZZ.qsZqxovh1zl5Ze42Uilssc7kjmNDYuwztgnmZekfGqmMO	David Mendez	admin	t	2026-09-29 15:42:17.944636+00	2026-09-29 16:09:30.235828+00
b69959e1-098f-450c-85f3-c2929b62c26b	psjesus@gospel.com	$2b$10$nrAWHBVRFJJ3r5iVgObKluO7GWjxJ9DA4hvA5.0HYKMmju31proWG	Pastor Jesus Hernandez	admin	t	2026-09-29 17:50:41.875993+00	2026-09-29 17:50:41.875993+00
\.


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: configuracion_sistema configuracion_sistema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.configuracion_sistema
    ADD CONSTRAINT configuracion_sistema_pkey PRIMARY KEY (clave);


--
-- Name: miembros miembros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.miembros
    ADD CONSTRAINT miembros_pkey PRIMARY KEY (id);


--
-- Name: pactos_miembros pactos_miembros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pactos_miembros
    ADD CONSTRAINT pactos_miembros_pkey PRIMARY KEY (id);


--
-- Name: proyectos_pactados proyectos_pactados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proyectos_pactados
    ADD CONSTRAINT proyectos_pactados_pkey PRIMARY KEY (id);


--
-- Name: transacciones transacciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_transacciones_dia_semana; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transacciones_dia_semana ON public.transacciones USING btree (dia_semana);


--
-- Name: idx_transacciones_fecha; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transacciones_fecha ON public.transacciones USING btree (fecha DESC);


--
-- Name: idx_transacciones_proyecto; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transacciones_proyecto ON public.transacciones USING btree (proyecto_id);


--
-- Name: idx_transacciones_subtipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transacciones_subtipo ON public.transacciones USING btree (subtipo);


--
-- Name: idx_transacciones_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transacciones_tipo ON public.transacciones USING btree (tipo);


--
-- Name: idx_usuarios_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usuarios_email ON public.usuarios USING btree (lower((email)::text));


--
-- Name: pactos_miembros pactos_miembros_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pactos_miembros
    ADD CONSTRAINT pactos_miembros_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos_pactados(id) ON DELETE CASCADE;


--
-- Name: transacciones transacciones_miembro_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_miembro_id_fkey FOREIGN KEY (miembro_id) REFERENCES public.miembros(id) ON DELETE SET NULL;


--
-- Name: transacciones transacciones_pacto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_pacto_id_fkey FOREIGN KEY (pacto_id) REFERENCES public.pactos_miembros(id) ON DELETE SET NULL;


--
-- Name: transacciones transacciones_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transacciones
    ADD CONSTRAINT transacciones_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES public.proyectos_pactados(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict eZtmQplpf8ae9e2JBDoyqi02mTQz5i1sy2D56oQkxQl7napamypa1fgBQSGCDuR

