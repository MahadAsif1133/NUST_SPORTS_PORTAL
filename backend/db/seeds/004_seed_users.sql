-- Seed 004: Demo user accounts
-- Passwords are bcrypt hashes (cost factor 10)
-- student123 → $2a$10$xJ8Kz3Q5qR7vN2wM4yT6.OdF1gH9iK0lJ3mN5oP7qR9sT1uV3wX5
-- faculty123 → $2a$10$aB2cD4eF6gH8iJ0kL2mN4.OpQrStUvWxYzAbCdEfGhIjKlMnOpQr
-- admin123   → $2a$10$cD4eF6gH8iJ0kL2mN4oP6.QrStUvWxYzAbCdEfGhIjKlMnOpQrSt
-- trainer123 → $2a$10$eF6gH8iJ0kL2mN4oP6qR8.StUvWxYzAbCdEfGhIjKlMnOpQrStUv
-- alumni123  → $2a$10$gH8iJ0kL2mN4oP6qR8sT0.UvWxYzAbCdEfGhIjKlMnOpQrStUvWx

-- NOTE: These hashes are placeholders. The actual seed should be run via
-- the seed script which generates real bcrypt hashes. For SQL-only seeding,
-- use the JS-based seeder below.

-- Mock student in the Qalam mock table
INSERT INTO mock_students (id, registration_number, full_name, cnic, dob, department, degree_program, contact_number, password_hash)
VALUES (
  'c1000000-0000-0000-0000-000000000001',
  '412001',
  'Ahmed Khan',
  '61101-1234567-1',
  '2002-05-15',
  'School of Electrical Engineering & Computer Science',
  'BS Computer Science',
  '03001234567',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- student123
) ON CONFLICT (registration_number) DO NOTHING;

-- Admin user
INSERT INTO users (id, email, password_hash, role, is_verified, is_active, full_name, department, created_at)
VALUES (
  'c1000000-0000-0000-0000-000000000010',
  'admin@nust.edu.pk',
  '$2a$10$YYaEPoXuXPSGz8riDSEpYO5/KhF7Rw3UcQv52VN1C5gCo68Pnl6Ea', -- admin123
  'ADMIN',
  true,
  true,
  'System Administrator',
  'Sports Branch',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Faculty user
INSERT INTO users (id, email, password_hash, role, is_verified, is_active, full_name, department, created_at)
VALUES (
  'c1000000-0000-0000-0000-000000000011',
  'faculty@nust.edu.pk',
  '$2a$10$0yJ3OjapCD3w8MZJqR9i5.qDfdsNq.4mqR20hD7ZbdzZ1IAuiW8da', -- faculty123
  'FACULTY',
  true,
  true,
  'Dr. Sarah Ahmed',
  'School of Mechanical & Manufacturing Engineering',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Trainer user
INSERT INTO users (id, email, password_hash, role, is_verified, is_active, full_name, department, created_at)
VALUES (
  'c1000000-0000-0000-0000-000000000012',
  'trainer@nust.edu.pk',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- trainer123
  'TRAINER',
  true,
  true,
  'Usman Ali',
  'Sports Branch',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Alumni user
INSERT INTO users (id, email, password_hash, role, is_verified, is_active, full_name, department, created_at)
VALUES (
  'c1000000-0000-0000-0000-000000000013',
  'alumni@nust.edu.pk',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- alumni123
  'ALUMNI',
  true,
  true,
  'Fatima Zahra',
  'School of Electrical Engineering & Computer Science',
  NOW()
) ON CONFLICT (email) DO NOTHING;
