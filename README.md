# NUST Sports Portal

A full-stack web application to digitize and manage sports facility memberships (Swimming Pool, Gym, Saddle Club) at NUST. Replaces the manual paper-based process with an online system featuring proper checks and balances.

## Tech Stack

- **Frontend**: React 18 + Tailwind CSS 3 + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL 16
- **Auth**: JWT-based sessions with refresh tokens
- **File Storage**: Local disk (S3-swappable via provider interface)

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 16 (or Docker)

### 1. Start the database
```bash
docker-compose up -d
```

### 2. Set up the backend
```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

### 3. Set up the frontend
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (frontend) and `http://localhost:3000` (API).

## Demo Accounts (Seeded)

| Role | Login | Password |
|------|-------|----------|
| Student | 412001 (reg number) | student123 |
| Faculty | faculty@nust.edu.pk | faculty123 |
| Admin | admin@nust.edu.pk | admin123 |
| Trainer | trainer@nust.edu.pk | trainer123 |
| Alumni | alumni@nust.edu.pk | alumni123 |

## Project Structure

```
├── frontend/          # React + Tailwind CSS application
├── backend/           # Node.js + Express API server
│   ├── src/           # Application source code
│   ├── db/            # Migrations and seed data
│   └── uploads/       # File storage (gitignored)
└── docs/              # Documentation
```

## External Integrations (Mocked)

All external integrations are built behind clean interfaces for easy swap-out:

- **University SSO**: `MockQalamProvider` → swap to `RealQalamProvider`
- **Payment Gateway**: `MockJazzCashSandboxProvider` → swap to real JazzCash/HBL
- **File Storage**: `LocalDiskStorageProvider` → swap to `S3StorageProvider`

## License

Internal university project — not licensed for external use.
