---
name: project-plan
description: Implementation plan for turning the inventory demo into a real multi-user app.
metadata:
  type: project
---

# Implementation Plan: Inventory App Productionization

## Current State
- **Frontend**: Browser-only demo. Data persists in `localStorage` via Zustand. Login is hardcoded plaintext check. `lib/api.ts` is unused.
- **Backend**: Minimal Express server. `backend/prisma/schema.prisma` exists but isn't used (raw `pg` is used in `backend/src/db.js`).
- **Database**: Inconsistent schema across frontend types, Prisma schema, and raw SQL.

## Phases

### Phase 0: Repo Hygiene
- [ ] `.gitignore` creation/update.
- [ ] Remove `done.txt`, `tsconfig.tsbuildinfo`.
- [ ] README update (Done).
- [ ] Replace `xlsx` with `exceljs` in `lib/excel-parser.ts`.
- [ ] Add `docker-compose.yml` for Postgres.
- [ ] Add root script to run both frontend and backend.

### Phase 1: One Database Schema
- [ ] Install Prisma in `backend`.
- [ ] Unify schema: `app/types/inventory.ts` $\rightarrow$ `prisma.schema`.
- [ ] Add `paidAmount` to `Product`.
- [ ] Fix `ProductStatus` and `ActivityType` enums (use `@map`).
- [ ] Make `Category.productCount` derived (remove from schema).
- [ ] Add indexes (SKU unique, FKs, movement lookups).
- [ ] Secure seed script: hash admin password from env, optional demo data.
- [ ] Auto-migration on server start.

### Phase 2: Backend API
- [ ] Auth Middleware: JWT verification $\rightarrow$ Role Guard.
- [ ] Role Permissions:
    - `admin`: All access.
    - `manager`: Products, Categories, Movements, Order Requests (approve/reject).
    - `executive`: Read-only access to products, movements, and reports.
- [ ] Hardening: Required `JWT_SECRET`, restricted CORS, `helmet`, rate limiting on `/auth/login`.
- [ ] Session Management: `httpOnly`, `SameSite=Lax` cookies.
- [ ] Next.js Proxy: Add rewrites for `/api/*` $\rightarrow$ Backend.
- [ ] Zod endpoints for all UI actions (CRUD for products, categories, etc.).
- [ ] Stock Movement Transaction:
    - Lock product row.
    - Check for negative stock.
    - Update quantity + status.
    - Log movement + activity.
- [ ] Pagination and Filters for products/movements.
- [ ] Supertest suite for auth, roles, and movement rules.

### Phase 3: Connect the Frontend
- [ ] Migrate `lib/store.ts` from `localStorage` to TanStack Query.
- [ ] Remove demo data and plaintext auth.
- [ ] Implement login/logout and route guards (Role-based).
- [ ] Connect all pages to API (loading/empty/error states).
- [ ] Update Excel upload to use server-side bulk endpoint.
- [ ] Dashboard metrics $\rightarrow$ API summary endpoints.

### Phase 4: Tally Readiness
- [ ] Add Tally columns: `tallyGuid`, `tallyName`, `syncStatus`, `lastSyncedAt`.
- [ ] Add `SyncJob` table.
- [ ] Wrap stock/order changes in a service layer for future sync enqueuing.

### Phase 5: Verification
- [ ] Manual test checklist execution.
- [ ] Final README/env update.

## Risks & Decisions
- **Decision**: Use TanStack Query for server state and keep Zustand only for transient UI state (e.g., sidebar open/closed).
- **Risk**: Concurrent stock movements. Mitigation: Database transactions with row-level locking (`SELECT FOR UPDATE`).
- **Decision**: Roles: `executive` is purely a "viewer" for reporting purposes.
