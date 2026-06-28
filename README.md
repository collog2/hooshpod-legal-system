# Hooshpod Legal Management System

Production-style Legal Management System MVP built with NestJS, Prisma, PostgreSQL, and Vue 3.

## Quick start

```bash
docker compose up --build
```

Services:

| Service      | URL                            |
| ------------ | ------------------------------ |
| Frontend     | http://localhost:5173          |
| Backend API  | http://localhost:3000/api/v1   |
| Swagger docs | http://localhost:3000/api/docs |
| PostgreSQL   | localhost:5432                 |

Migrations and seed data run automatically when the backend container starts.

## Seed credentials

| Role    | Email                 | Password    |
| ------- | --------------------- | ----------- |
| Admin   | admin@hooshpod.com    | Admin123!   |
| Manager | manager@hooshpod.com  | Manager123! |
| Counsel | counsel1@hooshpod.com | Counsel123! |
| Counsel | counsel2@hooshpod.com | Counsel123! |
| Viewer  | viewer@hooshpod.com   | Viewer123!  |

## Local development (without Docker)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Implemented modules

- Docker Compose (postgres, backend, frontend)
- Authentication (JWT login, `/auth/me`)
- Users (CRUD with RBAC; soft delete)
- Vue shell (login, dashboard placeholder, user management UI)

## Environment variables

See `backend/.env.example` and `frontend/.env.example`.
