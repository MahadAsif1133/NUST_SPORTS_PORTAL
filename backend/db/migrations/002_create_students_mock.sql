-- Migration 002: Create mock_students table
-- Simulated Qalam SSO data source for student authentication

CREATE TABLE mock_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  cnic VARCHAR(15) NOT NULL,
  dob DATE NOT NULL,
  department VARCHAR(255) NOT NULL,
  degree_program VARCHAR(255) NOT NULL,
  photo_url VARCHAR(500),
  contact_number VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL
);

CREATE INDEX idx_mock_students_reg ON mock_students(registration_number);
