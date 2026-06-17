--
-- PostgreSQL database dump
--

\restrict wDqIauKLQgFhXAbCmoVtsHL62Yer0MSezsfVgawgaQzeSRQpTo2FpNgeu23b2ix

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: PromotionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PromotionStatus" AS ENUM (
    'DRAFT',
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: PromotionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PromotionType" AS ENUM (
    'FLYER',
    'DISCOUNT',
    'BUFFET',
    'CATERING',
    'COUPON',
    'EVENT'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'USER',
    'OWNER',
    'STAFF',
    'ADMIN'
);


--
-- Name: StaffRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StaffRole" AS ENUM (
    'MANAGER',
    'STAFF'
);


--
-- Name: SubscriptionPlan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionPlan" AS ENUM (
    'STARTER',
    'PRO',
    'PREMIUM'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'PAST_DUE',
    'CANCELED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    "actorId" text,
    action text NOT NULL,
    entity text,
    "entityId" text,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: DeviceToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DeviceToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    token text NOT NULL,
    platform text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Favorite; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Favorite" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "promotionId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: MenuItem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MenuItem" (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    name text NOT NULL,
    description text,
    price double precision,
    "imageUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    "promotionId" text,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Promotion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Promotion" (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    type public."PromotionType" NOT NULL,
    title text NOT NULL,
    description text,
    badge text,
    "imageUrl" text,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."PromotionStatus" DEFAULT 'PENDING'::public."PromotionStatus" NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    clicks integer DEFAULT 0 NOT NULL,
    "flyerViews" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    featured boolean DEFAULT false NOT NULL,
    category text,
    "flyerPdfUrl" text,
    "expiringNotified" boolean DEFAULT false NOT NULL
);


--
-- Name: PushCampaign; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PushCampaign" (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    audience text DEFAULT 'all'::text NOT NULL,
    recipients integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Restaurant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Restaurant" (
    id text NOT NULL,
    "ownerId" text NOT NULL,
    name text NOT NULL,
    cuisine text,
    description text,
    phone text,
    "addressLine" text,
    city text,
    state text,
    zip text,
    latitude double precision,
    longitude double precision,
    "coverImageUrl" text,
    "logoUrl" text,
    "priceRange" text,
    rating double precision DEFAULT 0 NOT NULL,
    "reviewCount" integer DEFAULT 0 NOT NULL,
    "isOpen" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    photos text[] DEFAULT ARRAY[]::text[]
);


--
-- Name: StaffMember; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StaffMember" (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    "userId" text,
    name text NOT NULL,
    email text NOT NULL,
    role public."StaffRole" DEFAULT 'STAFF'::public."StaffRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Subscription" (
    id text NOT NULL,
    "restaurantId" text NOT NULL,
    plan public."SubscriptionPlan" DEFAULT 'STARTER'::public."SubscriptionPlan" NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    "currentPeriodEnd" timestamp(3) without time zone,
    "promosLimit" integer DEFAULT 2 NOT NULL,
    "promosUsed" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "firebaseUid" text NOT NULL,
    email text NOT NULL,
    name text,
    "photoUrl" text,
    role public."Role",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    latitude double precision,
    longitude double precision
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AuditLog" (id, "actorId", action, entity, "entityId", metadata, "createdAt") FROM stdin;
\.


--
-- Data for Name: DeviceToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DeviceToken" (id, "userId", token, platform, "createdAt") FROM stdin;
b69fda60-e987-4a96-8f11-61a2421da531	13045844-de45-4525-aeea-69acca84c859	cTBQtoZESZmRvkZbie0LS7:APA91bGfndwXYFndvKhvyK0nZr9upDX459IHmovm7UdONgW-_suLo6P5bjbBxSTiyXhIJHmAfZo9rvhCETHYejXL7iZp3ontTxKbfjf-xQQ0f8PXMYt6ZSA	android	2026-06-14 16:34:54.662
a9587aab-e85e-4a49-8beb-c8e67563b9b0	13045844-de45-4525-aeea-69acca84c859	dK0g9n_LSNKaKbZXXOQ8Gl:APA91bFPJAViWLPDFcVvnYRX7BS_f3S53-lrrHVqWxb1NvHrv6eQOe8rS2UpckyMeMIFtfiU4Zp09milTTmon3FOJGAAV0Ksy-yXj0K_KfHqinS1IYGzXls	android	2026-06-16 06:33:40.187
\.


--
-- Data for Name: Favorite; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Favorite" (id, "userId", "promotionId", "createdAt") FROM stdin;
\.


--
-- Data for Name: MenuItem; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MenuItem" (id, "restaurantId", name, description, price, "imageUrl", "createdAt") FROM stdin;
671bc77c-64a1-41bc-a002-9d78299ce4ab	5e857c3e-4cd2-4e86-bddc-df19723021b8	curry	\N	20	/uploads/1781450533228-913161685.jpg	2026-06-14 15:22:20.63
b62d9eda-b77e-46f2-aeb7-c0295cb909b1	5e857c3e-4cd2-4e86-bddc-df19723021b8	curry	\N	20	/uploads/1781451832004-263894615.jpg	2026-06-14 15:44:03.691
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Notification" (id, "userId", type, title, body, "promotionId", read, "createdAt") FROM stdin;
\.


--
-- Data for Name: Promotion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Promotion" (id, "restaurantId", type, title, description, badge, "imageUrl", "startDate", "endDate", status, views, clicks, "flyerViews", "createdAt", "updatedAt", featured, category, "flyerPdfUrl", "expiringNotified") FROM stdin;
8b53e6c2-61cc-40dc-b23b-d0676089e180	5e857c3e-4cd2-4e86-bddc-df19723021b8	DISCOUNT	Biryani	Flat 30% off on all dum biryanis this weekend.	30%	/uploads/1781434365754-182005289.jpg	2026-06-14 12:00:00	2026-06-19 12:00:00	APPROVED	0	0	0	2026-06-14 10:52:45.843	2026-06-14 10:52:45.843	f	\N	\N	f
6d8903dc-6de7-4e3c-9de0-a9a11570d951	5e857c3e-4cd2-4e86-bddc-df19723021b8	DISCOUNT	weekend biryani	Flat 30% off on all dum biryani this weekend.	30%	\N	2026-06-14 12:00:00	2026-06-19 12:00:00	APPROVED	0	0	0	2026-06-14 11:37:35.746	2026-06-14 11:37:35.746	f	\N	\N	f
59587983-287a-42d3-bcfe-31a4d7624b2f	5e857c3e-4cd2-4e86-bddc-df19723021b8	DISCOUNT	curry	20% off this weekend	20%	/uploads/1781453556513-196578147.jpg	2026-06-14 12:00:00	2026-06-20 12:00:00	APPROVED	0	0	0	2026-06-14 16:12:36.63	2026-06-14 16:12:36.63	f	South Indian	\N	f
4922c2b7-b1df-431b-a4cd-fb309b5ff379	5e857c3e-4cd2-4e86-bddc-df19723021b8	DISCOUNT	weekend biryani	Flat 30% off all dum biryani this weekend.	30%	/uploads/1781437181987-130380539.jpg	2026-06-14 12:00:00	2026-06-20 12:00:00	APPROVED	1	2	1	2026-06-14 11:39:42.102	2026-06-14 16:18:02.071	t	\N	\N	f
\.


--
-- Data for Name: PushCampaign; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."PushCampaign" (id, "restaurantId", title, message, audience, recipients, "createdAt") FROM stdin;
02470d69-6db8-4220-ad72-612f95a9ef0b	5e857c3e-4cd2-4e86-bddc-df19723021b8	weekend deal	deal	all	1	2026-06-14 16:39:34.7
\.


--
-- Data for Name: Restaurant; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Restaurant" (id, "ownerId", name, cuisine, description, phone, "addressLine", city, state, zip, latitude, longitude, "coverImageUrl", "logoUrl", "priceRange", rating, "reviewCount", "isOpen", "createdAt", "updatedAt", photos) FROM stdin;
5e857c3e-4cd2-4e86-bddc-df19723021b8	13045844-de45-4525-aeea-69acca84c859	Taste of India	North Indian	\N						\N	\N	/uploads/1781593234826-477520975.jpg	/uploads/1781450217125-559934399.jpg	\N	0	0	t	2026-06-13 22:23:06.384	2026-06-16 07:00:36.468	{/uploads/1781450217125-559934399.jpg,/uploads/1781451821750-819396759.jpg}
\.


--
-- Data for Name: StaffMember; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StaffMember" (id, "restaurantId", "userId", name, email, role, "createdAt") FROM stdin;
fbd0e6bc-3ad8-4a4d-abf0-0af1eac771fb	5e857c3e-4cd2-4e86-bddc-df19723021b8	\N	Ram	ram@gmail.com	MANAGER	2026-06-14 15:24:59.124
\.


--
-- Data for Name: Subscription; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Subscription" (id, "restaurantId", plan, status, "currentPeriodEnd", "promosLimit", "promosUsed", "createdAt", "updatedAt") FROM stdin;
e749bf92-316d-40ab-9b71-20531ecd41ae	5e857c3e-4cd2-4e86-bddc-df19723021b8	PREMIUM	ACTIVE	\N	9999	0	2026-06-13 22:23:06.384	2026-06-16 07:36:38.143
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, "firebaseUid", email, name, "photoUrl", role, "createdAt", "updatedAt", latitude, longitude) FROM stdin;
13045844-de45-4525-aeea-69acca84c859	w4Jr9g84BcTIDkG0Qff8c4AKqSq2	parvatisingh@gmail.com	\N	\N	OWNER	2026-06-13 19:37:21.348	2026-06-13 19:37:32.654	\N	\N
9b403156-9ed5-4442-8bc8-a4a956fd4cba	5rcg6M8nbgYUKZl1C1Jntpy4A5c2	cust1@dealplate.com	\N	\N	USER	2026-06-13 21:23:35.79	2026-06-13 21:24:00.723	\N	\N
66a5f305-defd-4def-9ca2-baf09189bf46	LQMHayDnw1NlCAmmertQU5D2XIG3	singhparvati@gmail.com	Parvati	/uploads/1781453376560-409377629.jpg	USER	2026-06-13 19:40:54.621	2026-06-14 16:09:40.488	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
7cb5ce20-1ff7-43c7-9f51-308fbda05ad4	c6ac20dccaba9e08c97e2fbd828def3531b8302283627a7cedc7265fed9c6608	2026-06-14 00:04:32.960236+05:30	20260613174547_init	\N	\N	2026-06-14 00:04:32.944438+05:30	1
b5e82b4a-5c2f-47d1-b4aa-3ac1479250da	1ad4f5ea11d58b0b87b3acb0bb8454914120b8c104ad60ac56b91e6e8b022061	2026-06-14 02:34:08.001267+05:30	20260613210407_marketplace_schema	\N	\N	2026-06-14 02:34:07.983459+05:30	1
64263d34-fe89-4f78-a663-83d92b7c5301	b0cd8e4c0df5f7fe72488fc2177cdbcccbb57cf2d6d9db3e8d20edcc79e4953c	2026-06-14 18:57:26.006815+05:30	20260614132726_promotion_featured	\N	\N	2026-06-14 18:57:26.004729+05:30	1
208a58e3-0c65-4900-b6f6-a73ab2f094a6	b9280f38db01c82780cf5df4f23178545117a9da6f95a01b5a55d832e9adc04e	2026-06-14 19:35:55.545455+05:30	20260614140555_menu_campaigns_photos	\N	\N	2026-06-14 19:35:55.536788+05:30	1
9dd9a339-4db7-4bb2-adde-4329850ea6c5	3da9f5751c33fa492608cec7954f3cc0c3a74438738f21630882260068e57809	2026-06-14 21:21:30.573707+05:30	20260614155130_add_promotion_category	\N	\N	2026-06-14 21:21:30.571649+05:30	1
99c7ab23-de0b-457d-88dd-9af7555f582b	8180efdebe09c5daa00383b23dec5404b8c115ada48f7f88f1f5bb5519e0b5e6	2026-06-16 12:31:42.457015+05:30	20260616070142_add_flyer_pdf_url	\N	\N	2026-06-16 12:31:42.455801+05:30	1
dbcecf5e-6a94-49c4-aef7-4f0ee5531200	c9083922ada0ade85d73c1e60978dfe3f70ad6684fe9869ab8a89496ff8dfe5b	2026-06-16 13:47:17.61087+05:30	20260616081717_notifications_geo_expiry	\N	\N	2026-06-16 13:47:17.605055+05:30	1
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: DeviceToken DeviceToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviceToken"
    ADD CONSTRAINT "DeviceToken_pkey" PRIMARY KEY (id);


--
-- Name: Favorite Favorite_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_pkey" PRIMARY KEY (id);


--
-- Name: MenuItem MenuItem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MenuItem"
    ADD CONSTRAINT "MenuItem_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Promotion Promotion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Promotion"
    ADD CONSTRAINT "Promotion_pkey" PRIMARY KEY (id);


--
-- Name: PushCampaign PushCampaign_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushCampaign"
    ADD CONSTRAINT "PushCampaign_pkey" PRIMARY KEY (id);


--
-- Name: Restaurant Restaurant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Restaurant"
    ADD CONSTRAINT "Restaurant_pkey" PRIMARY KEY (id);


--
-- Name: StaffMember StaffMember_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffMember"
    ADD CONSTRAINT "StaffMember_pkey" PRIMARY KEY (id);


--
-- Name: Subscription Subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_entity_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "AuditLog_entity_entityId_idx" ON public."AuditLog" USING btree (entity, "entityId");


--
-- Name: DeviceToken_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DeviceToken_token_key" ON public."DeviceToken" USING btree (token);


--
-- Name: Favorite_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Favorite_userId_idx" ON public."Favorite" USING btree ("userId");


--
-- Name: Favorite_userId_promotionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Favorite_userId_promotionId_key" ON public."Favorite" USING btree ("userId", "promotionId");


--
-- Name: MenuItem_restaurantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MenuItem_restaurantId_idx" ON public."MenuItem" USING btree ("restaurantId");


--
-- Name: Notification_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Notification_userId_idx" ON public."Notification" USING btree ("userId");


--
-- Name: Promotion_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Promotion_category_idx" ON public."Promotion" USING btree (category);


--
-- Name: Promotion_restaurantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Promotion_restaurantId_idx" ON public."Promotion" USING btree ("restaurantId");


--
-- Name: Promotion_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Promotion_status_idx" ON public."Promotion" USING btree (status);


--
-- Name: Promotion_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Promotion_type_idx" ON public."Promotion" USING btree (type);


--
-- Name: PushCampaign_restaurantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "PushCampaign_restaurantId_idx" ON public."PushCampaign" USING btree ("restaurantId");


--
-- Name: Restaurant_city_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Restaurant_city_idx" ON public."Restaurant" USING btree (city);


--
-- Name: Restaurant_latitude_longitude_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Restaurant_latitude_longitude_idx" ON public."Restaurant" USING btree (latitude, longitude);


--
-- Name: Restaurant_ownerId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Restaurant_ownerId_key" ON public."Restaurant" USING btree ("ownerId");


--
-- Name: Restaurant_zip_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Restaurant_zip_idx" ON public."Restaurant" USING btree (zip);


--
-- Name: StaffMember_restaurantId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StaffMember_restaurantId_idx" ON public."StaffMember" USING btree ("restaurantId");


--
-- Name: Subscription_restaurantId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Subscription_restaurantId_key" ON public."Subscription" USING btree ("restaurantId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_firebaseUid_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_firebaseUid_key" ON public."User" USING btree ("firebaseUid");


--
-- Name: DeviceToken DeviceToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DeviceToken"
    ADD CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favorite Favorite_promotionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES public."Promotion"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favorite Favorite_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MenuItem MenuItem_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MenuItem"
    ADD CONSTRAINT "MenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public."Restaurant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Promotion Promotion_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Promotion"
    ADD CONSTRAINT "Promotion_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public."Restaurant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PushCampaign PushCampaign_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PushCampaign"
    ADD CONSTRAINT "PushCampaign_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public."Restaurant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Restaurant Restaurant_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Restaurant"
    ADD CONSTRAINT "Restaurant_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffMember StaffMember_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffMember"
    ADD CONSTRAINT "StaffMember_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public."Restaurant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StaffMember StaffMember_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StaffMember"
    ADD CONSTRAINT "StaffMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Subscription Subscription_restaurantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Subscription"
    ADD CONSTRAINT "Subscription_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES public."Restaurant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict wDqIauKLQgFhXAbCmoVtsHL62Yer0MSezsfVgawgaQzeSRQpTo2FpNgeu23b2ix

