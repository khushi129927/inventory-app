# Inventory Management App

A multi-user inventory system built with Next.js 16, React 19, and Express 5.

## Architecture

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS, shadcn/ui, Zustand (UI state), TanStack Query (server state).
- **Backend**: Express 5 (ESM), PostgreSQL, Prisma (ORM), JWT Auth, Zod (validation).
- **Database**: PostgreSQL.

## Setup on Windows

### Prerequisites
- Node.js (Latest LTS)
- Docker Desktop (for PostgreSQL)

### 1. Infrastructure
Start the PostgreSQL database:
```powershell
docker-compose up -d
```

### 2. Backend Setup
```powershell
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npx prisma migrate dev
npm run seed
npm start
```

### 3. Frontend Setup
```powershell
npm install
cp .env.example .env
# Edit .env with your API_URL
npm run dev
```

### 4. Running Together
Use the root script:
```powershell
npm run dev:all
```

## Environment Variables

### Backend (`backend/.env`)
- `DATABASE_URL`: Connection string for PostgreSQL.
- `JWT_SECRET`: Secret key for signing JWTs.
- `CORS_ORIGIN`: Allowed origins for API requests.
- `ADMIN_USERNAME`: Initial admin username for seeding.
- `ADMIN_PASSWORD`: Initial admin password for seeding.
- `SEED_DEMO_DATA`: Set to `true` to populate with demo data.

### Frontend (`.env`)
- `NEXT_PUBLIC_API_URL`: URL of the backend server.

## Testing

### Backend Tests
```powershell
cd backend
npm test
```

### Frontend Tests
```powershell
npm test
```
