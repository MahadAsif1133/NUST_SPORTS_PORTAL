-- Seed 002: Rate tables
-- Policy:
--   Individual membership (Pool only OR Gym only): Rs 1000/month (students)
--   Master Card (Pool + Gym combined):             Rs 1500/month (students)
--   Faculty individual per facility:               Rs 2000/month
--   Faculty Master Card (Pool + Gym):              Rs 2500/month

-- === SWIMMING POOL RATES ===
INSERT INTO rate_tables (id, facility_id, category_code, category_label, registration_fee, monthly_fee, applies_to_roles, effective_from) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'STUDENT',     'Student (Individual)',              2000, 1000,  ARRAY['STUDENT'],                   '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'FACULTY',     'Faculty / Officers (Individual)',   3000, 2000,  ARRAY['FACULTY','OFFICER'],          '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'ALUMNI',      'Alumni',                            5000, 3000,  ARRAY['ALUMNI'],                    '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'RIC_PAK',     'RIC/NSTP Tenants (Pakistani)',      10000, 5000, ARRAY['RIC_TENANT','NSTP_TENANT'],   '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'RIC_FOREIGN', 'RIC/NSTP Tenants (Foreigners)',     20000, 10000,ARRAY['RIC_TENANT','NSTP_TENANT'],   '2024-01-01');

-- === GYM RATES ===
INSERT INTO rate_tables (id, facility_id, category_code, category_label, registration_fee, monthly_fee, applies_to_roles, effective_from) VALUES
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', 'STUDENT',     'Student (Individual)',              2000, 1000,  ARRAY['STUDENT'],                   '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', 'FACULTY',     'Faculty / Officers (Individual)',   3000, 2000,  ARRAY['FACULTY','OFFICER'],          '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000002', 'ALUMNI',      'Alumni',                            5000, 3000,  ARRAY['ALUMNI'],                    '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000002', 'RIC_PAK',     'RIC/NSTP Tenants (Pakistani)',      10000, 5000, ARRAY['RIC_TENANT','NSTP_TENANT'],   '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000002', 'RIC_FOREIGN', 'RIC/NSTP Tenants (Foreigners)',     20000, 10000,ARRAY['RIC_TENANT','NSTP_TENANT'],   '2024-01-01');

-- === SADDLE CLUB RATES ===
INSERT INTO rate_tables (id, facility_id, category_code, category_label, registration_fee, monthly_fee, applies_to_roles, effective_from) VALUES
  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000003', 'STUDENT',     'Student',                           2000, 1000,  ARRAY['STUDENT'],                   '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000003', 'FACULTY',     'Faculty / Officers',                3000, 2000,  ARRAY['FACULTY','OFFICER'],          '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000013', 'a1000000-0000-0000-0000-000000000003', 'ALUMNI',      'Alumni',                            5000, 3000,  ARRAY['ALUMNI'],                    '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000014', 'a1000000-0000-0000-0000-000000000003', 'RIC_PAK',     'RIC/NSTP Tenants (Pakistani)',      10000, 5000, ARRAY['RIC_TENANT','NSTP_TENANT'],   '2024-01-01'),
  ('b1000000-0000-0000-0000-000000000015', 'a1000000-0000-0000-0000-000000000003', 'RIC_FOREIGN', 'RIC/NSTP Tenants (Foreigners)',     20000, 10000,ARRAY['RIC_TENANT','NSTP_TENANT'],   '2024-01-01');

-- === MASTER CARDS (Pool + Gym combined) ===
-- Policy: Master Card = Rs 1500/month (student), Rs 2500/month (faculty)
-- This is cheaper than buying Pool (1000) + Gym (1000) separately = 2000
INSERT INTO rate_tables (id, facility_id, category_code, category_label, registration_fee, monthly_fee, applies_to_roles, covers_facilities, effective_from) VALUES
  ('b1000000-0000-0000-0000-000000000016', NULL, 'MASTER_STUDENT',
   'Master Card — Student (Pool + Gym) ★ Save Rs 500/month vs Individual',
   3000, 1500,
   ARRAY['STUDENT'],
   ARRAY['a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002']::uuid[],
   '2024-01-01'),

  ('b1000000-0000-0000-0000-000000000017', NULL, 'MASTER_FACULTY',
   'Master Card — Faculty/Staff (Pool + Gym) ★ Save Rs 1500/month vs Individual',
   5000, 2500,
   ARRAY['FACULTY','OFFICER'],
   ARRAY['a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002']::uuid[],
   '2024-01-01'),

  ('b1000000-0000-0000-0000-000000000018', NULL, 'MASTER_ALUMNI',
   'Master Card — Alumni (Pool + Gym) ★ Save Rs 2000/month vs Individual',
   8000, 4000,
   ARRAY['ALUMNI'],
   ARRAY['a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002']::uuid[],
   '2024-01-01');
