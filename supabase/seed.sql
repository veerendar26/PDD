-- ============================================================
-- EcoFix — Seed Data
-- seed.sql
-- ============================================================

-- ============================================================
-- CATEGORIES (top-level + sub-categories)
-- ============================================================

INSERT INTO public.categories (id, name, parent_id, display_order) VALUES
  ('c0000001-0000-0000-0000-000000000001', 'Electronics',          NULL, 1),
  ('c0000001-0000-0000-0000-000000000002', 'Home Appliances',      NULL, 2),
  ('c0000001-0000-0000-0000-000000000007', 'Electrical & Wiring',  NULL, 3);

-- Electronics sub-categories
INSERT INTO public.categories (id, name, parent_id, display_order) VALUES
  ('c0000002-0000-0000-0000-000000000001', 'Smartphones',       'c0000001-0000-0000-0000-000000000001', 1),
  ('c0000002-0000-0000-0000-000000000002', 'Laptops & PCs',     'c0000001-0000-0000-0000-000000000001', 2),
  ('c0000002-0000-0000-0000-000000000003', 'Televisions',       'c0000001-0000-0000-0000-000000000001', 3),
  ('c0000002-0000-0000-0000-000000000004', 'Audio Equipment',   'c0000001-0000-0000-0000-000000000001', 4),
  ('c0000002-0000-0000-0000-000000000005', 'Cameras',           'c0000001-0000-0000-0000-000000000001', 5),
  ('c0000002-0000-0000-0000-000000000006', 'Gaming Devices',    'c0000001-0000-0000-0000-000000000001', 6);

-- Appliances sub-categories
INSERT INTO public.categories (id, name, parent_id, display_order) VALUES
  ('c0000003-0000-0000-0000-000000000001', 'Washing Machines',  'c0000001-0000-0000-0000-000000000002', 1),
  ('c0000003-0000-0000-0000-000000000002', 'Refrigerators',     'c0000001-0000-0000-0000-000000000002', 2),
  ('c0000003-0000-0000-0000-000000000003', 'Air Conditioners',  'c0000001-0000-0000-0000-000000000002', 3),
  ('c0000003-0000-0000-0000-000000000004', 'Microwave Ovens',   'c0000001-0000-0000-0000-000000000002', 4),
  ('c0000003-0000-0000-0000-000000000005', 'Water Purifiers',   'c0000001-0000-0000-0000-000000000002', 5),
  ('c0000003-0000-0000-0000-000000000006', 'Vacuum Cleaners',   'c0000001-0000-0000-0000-000000000002', 6);

-- ============================================================
-- DEMO PROVIDER USERS (passwords are "EcoFix@123" — change in production)
-- In a real deployment these would be created via Supabase Auth signup.
-- For seeding, we insert directly using the service role.
-- ============================================================

-- Demo Provider 1: TechFix Solutions
INSERT INTO public.users (id, role, name, email, phone) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'technician', 'TechFix Solutions', 'techfix@demo.ecofix.in', '+91 98765 43210');

INSERT INTO public.provider_profiles (
  id, user_id, business_name, description, categories,
  verification_status, rating_avg, total_reviews,
  service_radius_km, doorstep_available, address, location
) VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'a0000001-0000-0000-0000-000000000001',
  'TechFix Solutions',
  'Certified electronics and smartphone repair specialists with 10+ years of experience.',
  ARRAY[
    'c0000001-0000-0000-0000-000000000001',
    'c0000002-0000-0000-0000-000000000001',
    'c0000002-0000-0000-0000-000000000002'
  ],
  'approved', 4.7, 124, 15, TRUE,
  '12 MG Road, Bengaluru, Karnataka 560001',
  ST_SetSRID(ST_MakePoint(77.6101, 12.9719), 4326)::GEOGRAPHY
);

-- Demo Provider 2: HomeCare Appliances
INSERT INTO public.users (id, role, name, email, phone) VALUES
  ('a0000001-0000-0000-0000-000000000002', 'technician', 'HomeCare Appliances', 'homecare@demo.ecofix.in', '+91 87654 32109');

INSERT INTO public.provider_profiles (
  id, user_id, business_name, description, categories,
  verification_status, rating_avg, total_reviews,
  service_radius_km, doorstep_available, address, location
) VALUES (
  'b0000001-0000-0000-0000-000000000002',
  'a0000001-0000-0000-0000-000000000002',
  'HomeCare Appliances',
  'Expert appliance repair: washing machines, refrigerators, ACs. Same-day doorstep service available.',
  ARRAY[
    'c0000001-0000-0000-0000-000000000002',
    'c0000003-0000-0000-0000-000000000001',
    'c0000003-0000-0000-0000-000000000002',
    'c0000003-0000-0000-0000-000000000003'
  ],
  'approved', 4.5, 89, 20, TRUE,
  '45 Indiranagar, Bengaluru, Karnataka 560038',
  ST_SetSRID(ST_MakePoint(77.6408, 12.9784), 4326)::GEOGRAPHY
);

-- Demo Provider 3: WoodCraft Furniture (pending verification — shows admin queue)
INSERT INTO public.users (id, role, name, email, phone) VALUES
  ('a0000001-0000-0000-0000-000000000003', 'technician', 'WoodCraft Furniture Repair', 'woodcraft@demo.ecofix.in', '+91 76543 21098');

INSERT INTO public.provider_profiles (
  id, user_id, business_name, description, categories,
  verification_status, rating_avg, total_reviews,
  service_radius_km, doorstep_available, address, location
) VALUES (
  'b0000001-0000-0000-0000-000000000003',
  'a0000001-0000-0000-0000-000000000003',
  'WoodCraft Furniture Repair',
  'Skilled furniture restoration — wood polishing, upholstery, structural repairs.',
  ARRAY['c0000001-0000-0000-0000-000000000003'],
  'pending', 0.00, 0, 10, FALSE,
  '78 Koramangala, Bengaluru, Karnataka 560038',
  ST_SetSRID(ST_MakePoint(77.6272, 12.9279), 4326)::GEOGRAPHY
);

-- Demo Customer Users
INSERT INTO public.users (id, role, name, email, phone) VALUES
  ('a0000002-0000-0000-0000-000000000001', 'customer', 'Priya Sharma', 'priya@demo.ecofix.in', '+91 99887 76655'),
  ('a0000002-0000-0000-0000-000000000002', 'customer', 'Rahul Verma',  'rahul@demo.ecofix.in', '+91 88776 65544');

-- Demo Admin User
INSERT INTO public.users (id, role, name, email, phone) VALUES
  ('a0000003-0000-0000-0000-000000000001', 'admin', 'EcoFix Admin', 'admin@ecofix.in', '+91 11111 00000');

