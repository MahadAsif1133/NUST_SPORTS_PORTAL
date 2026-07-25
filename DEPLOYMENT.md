# 🚀 Hosting & Deployment Guide — NUST Sports Portal

This guide provides step-by-step instructions to host the **NUST Sports Portal** (Frontend, Backend, and Database) on **Vercel** and free cloud services.

---

## 🏗️ Architecture Overview

| Component | Recommended Host | Free Tier Available? |
|-----------|------------------|----------------------|
| **Frontend (React + Vite)** | **Vercel** | ✅ Yes |
| **Backend (Node.js / Express)** | **Render** or **Railway** | ✅ Yes |
| **Database (PostgreSQL)** | **Neon.tech** or **Supabase** | ✅ Yes |

---

## Step 1: Deploy Database (PostgreSQL)

You need a hosted PostgreSQL database. We recommend **Neon.tech** (or **Supabase** / **Render Postgres**).

1. Sign up at [Neon.tech](https://neon.tech) (or [Supabase.com](https://supabase.com)).
2. Create a new PostgreSQL project (name: `nust-sports-portal`).
3. Copy the **Connection String** (DATABASE_URL). It looks like:
   ```env
   postgres://username:password@ep-xyz.region.aws.neon.tech/neondb?sslmode=require
   ```

---

## Step 2: Deploy Backend (Render / Railway)

Because the backend is a persistent Node.js Express server with database pooling and background jobs:

1. Sign up at [Render.com](https://render.com).
2. Click **New +** → **Web Service**.
3. Connect your GitHub repository containing this project.
4. Set the configuration:
   - **Name**: `nust-sports-backend`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add **Environment Variables** in Render settings:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: *(Your Postgres connection string from Step 1)*
   - `JWT_SECRET`: *(A long random secret string)*
   - `JWT_REFRESH_SECRET`: *(A long random secret string)*
   - `ENCRYPTION_KEY`: `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`
   - `CSRF_SECRET`: *(A long random secret string)*
   - `FRONTEND_URL`: *(Your Vercel frontend URL, e.g. https://nust-sports-portal.vercel.app)*
6. Click **Deploy Web Service**.
7. Once deployed, note down your Backend API URL (e.g. `https://nust-sports-backend.onrender.com`).

### 🗄️ Run Migrations & Seed Data
From your local machine terminal, run the migration against your hosted database:
```bash
cd backend
DATABASE_URL="your-neon-postgres-url-here" npm run migrate
DATABASE_URL="your-neon-postgres-url-here" npm run seed
```

---

## Step 3: Host Frontend on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your GitHub repository (`NUST Sports Portal`).
4. In the project setup screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: `https://nust-sports-backend.onrender.com/api/v1` *(replace with your actual backend URL)*
6. Click **Deploy**.

Vercel will build and host your frontend app! 🎉

---

## ⚡ Summary of Environment Variables needed

### Backend Environment Variables (`backend/.env` on Render)
- `PORT`: `3000` (auto-assigned by host)
- `NODE_ENV`: `production`
- `DATABASE_URL`: `postgres://...`
- `JWT_SECRET`: `your-random-jwt-secret`
- `JWT_REFRESH_SECRET`: `your-random-refresh-secret`
- `ENCRYPTION_KEY`: `32-byte-hex-key`
- `FRONTEND_URL`: `https://your-frontend.vercel.app`

### Frontend Environment Variables (`frontend/.env` on Vercel)
- `VITE_API_URL`: `https://your-backend-service.onrender.com/api/v1`

---

## 🧪 Testing your Deployed Application

Once both frontend and backend are deployed:
1. Open your Vercel URL (e.g., `https://nust-sports-portal.vercel.app`).
2. Test logging in using the seeded test credentials:
   - **Student**: `412001` / `student123`
   - **Admin**: `admin@nust.edu.pk` / `admin123`
