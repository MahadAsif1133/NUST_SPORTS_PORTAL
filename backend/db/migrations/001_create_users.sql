-- Migration 001: Create users table
-- Unified login table for all roles (Student, Faculty, Alumni, Tenant, Trainer, Admin)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM (
  'STUDENT', 'FACULTY', 'OFFICER', 'ALUMNI',
  'RIC_TENANT', 'NSTP_TENANT', 'TRAINER', 'ADMIN'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  role user_role NOT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_foreigner BOOLEAN NOT NULL DEFAULT false,
  full_name VARCHAR(255) NOT NULL,
  cnic_encrypted BYTEA,
  dob DATE,
  contact_number VARCHAR(20),
  photo_url VARCHAR(500),
  department VARCHAR(255),
  degree_program VARCHAR(255),
  registration_number VARCHAR(50) UNIQUE,
  verification_doc_path VARCHAR(500),
  otp_secret VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_registration_number ON users(registration_number);
CREATE INDEX idx_users_is_verified ON users(is_verified);
