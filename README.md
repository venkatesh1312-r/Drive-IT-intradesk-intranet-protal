# InfraDesk — Reward & Nomination Module

> Part of **InfraDesk**, a unified self-hosted internal platform for DriveIT Technologies.  
> This module is the **Reward System** — one of five planned modules in the portal.

---

## What is InfraDesk?

InfraDesk is a company-wide internal portal that consolidates HR and IT operations into a single authenticated platform. The five planned modules are:

| Module | Purpose | Status |
|---|---|---|
| **Reward System** | Peer recognition, nominations, points wallet | ✅ Active (this repo) |
| Help Desk | Raise and track IT/HR support tickets | 🔜 Coming Soon |
| Email ID Generation | Onboarding email provisioning | 🔜 Coming Soon |
| Policy Chatbot | AI-powered HR policy Q&A | 🔜 Coming Soon |
| Visitor Management | Gate visitor pre-registration & check-in | 🔜 Coming Soon |

All modules share the same login, sidebar layout, and role system (`EMPLOYEE`, `HR`, `ADMIN`).

---

## Reward Module — Overview

The Reward System lets employees nominate peers for their contributions. Nominations go through a structured approval hierarchy based on the type of recognition, with points awarded to the nominee on approval.

**Core entities:**
- **User** — has a role, earns points
- **Nomination** — submitted by any user, reviewed by HR or Admin
- **Points** — awarded on approval, stored on the nominee's account

---

## Complete Workflow

### 1. Login
- User visits `localhost:3000`, enters `@driveit.in` email + password
- Domain enforced client-side (instant) and server-side (DTO `@Matches` + service check)
- On success: JWT stored in `localStorage`, routed by role
  - `EMPLOYEE` → `/dashboard`
  - `HR` / `ADMIN` → `/admin`

### 2. Employee — Submit a Nomination
- Goes to **Reward System** in sidebar
- Clicks **+ Create Nomination**, fills modal form:
  - Nominee name, Nominated by, Project/Team, Category, Context/Reason
- Nomination saved to DB with status `PENDING`
- Card appears in their dashboard with amber **Pending** badge

### 3. HR — Review Queue
- HR logs in, sees **Reward System** showing only their category nominations:
  - **Team Player** and **Above & Beyond** (general recognition)
- Per nomination, HR can:
  - Enter points (1–10), check consent → **Approve** → status `APPROVED`, points credited
  - **Decline** → status `DECLINED`
  - **Escalate to Admin** → status `ESCALATED` (for complex/technical cases)

### 4. Admin — Full Control
- Admin sees **all nominations** including escalated ones
- Escalated cards are highlighted (indigo border + "Escalated from HR" banner)
- Admin can Approve or Decline any `PENDING` or `ESCALATED` nomination
- Also sees the **Innovation**, **Client Impact**, and **Mentorship** nominations directly (high-expertise categories)

### 5. Points & Wallet
- On approval: system does a case-insensitive name lookup for the nominee
  - If account found → points credited to their wallet immediately
  - If no account → nomination still approved, points linked later (Zoho integration planned)
- Employee sees their total points earned on the dashboard

### 6. Employee — Track Status
- Submitted nomination cards update automatically:
  - `Pending` → amber (waiting for HR)
  - `Under Review` → indigo (escalated, waiting for Admin)
  - `Approved` → green + points badge
  - `Declined` → red, nomination closed

---

## Nomination Routing by Category

| Category | Routes To | Who Acts |
|---|---|---|
| Team Player | HR Queue | HR approves / declines / escalates |
| Above & Beyond | HR Queue | HR approves / declines / escalates |
| Innovation | Admin Queue | Admin approves / declines directly |
| Client Impact | Admin Queue | Admin approves / declines directly |
| Mentorship | Admin Queue | Admin approves / declines directly |

---

## Status Lifecycle

```
PENDING ──► APPROVED   (HR or Admin approved)
        ──► DECLINED   (HR or Admin declined)
        ──► ESCALATED  (HR forwarded to Admin)

ESCALATED ──► APPROVED (Admin approved)
          ──► DECLINED (Admin declined)
```

---

## Role Capabilities

| Feature | EMPLOYEE | HR | ADMIN |
|---|---|---|---|
| Submit nomination | ✅ | ✅ | ✅ |
| View own nominations | ✅ | ✅ | ✅ |
| View points wallet | ✅ | ✅ | ✅ |
| See HR-category nominations | ✗ | ✅ | ✅ |
| See all nominations | ✗ | ✗ | ✅ |
| Approve / Decline | ✗ | ✅ (HR cats) | ✅ (all) |
| Escalate to Admin | ✗ | ✅ | ✅ |
| View stats dashboard | ✗ | ✅ | ✅ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, App Router, inline React styles |
| Backend | NestJS 10 |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (7-day) + bcrypt |

---

## Project Structure

```
reward-nomination-module/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Models: User, Nomination + enums
│   │   └── seed.ts              # Dev seed: admin, hr, employee users
│   └── src/
│       ├── auth/                # Login, register, JWT strategy, guards
│       ├── nominations/         # Full nomination CRUD, approve, decline, escalate
│       ├── users/               # Wallet + profile
│       └── main.ts              # CORS (origin: true, all headers), ValidationPipe
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx         # Login page (split layout, GPTW badge)
        │   ├── dashboard/       # Employee dashboard (overview + reward)
        │   └── admin/           # HR + Admin dashboard (role-scoped reward view)
        ├── components/
        │   └── DriveITLogo.tsx  # Full logo + collapsed mark for sidebar
        └── lib/
            └── api.ts           # API client — all endpoints, 5s abort timeout
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL (local, password: configured in `backend/.env`)

### Backend
```bash
cd backend
npm install
npx prisma db push        # sync schema to DB
npm run db:seed           # seed dev users
npm run start:dev         # http://localhost:3001 (watch mode)
```

### Frontend
```bash
cd frontend
npm install
npm run dev               # http://localhost:3000
```

### Dev Login Credentials

| Email | Password | Role |
|---|---|---|
| admin@driveit.in | admin123 | ADMIN |
| hr@driveit.in | hr123 | HR |
| employee@driveit.in | employee123 | EMPLOYEE |

---

## API Reference

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Login, returns JWT + user |
| POST | `/api/auth/register` | Public | Register (must be @driveit.in) |
| GET | `/api/users/me` | Any | Current user profile |
| GET | `/api/users/wallet` | Any | Points balance |
| POST | `/api/nominations` | Any | Submit a nomination |
| GET | `/api/nominations/mine` | Any | Nominations I submitted |
| GET | `/api/nominations/received` | Any | Approved nominations for me |
| GET | `/api/nominations` | HR, ADMIN | All nominations (HR gets HR-cats only) |
| GET | `/api/nominations/stats` | HR, ADMIN | `{total, pending, escalated, approved, declined}` |
| PATCH | `/api/nominations/:id/approve` | HR, ADMIN | Approve + award points |
| PATCH | `/api/nominations/:id/decline` | HR, ADMIN | Decline |
| PATCH | `/api/nominations/:id/escalate` | HR, ADMIN | Forward to Admin |

---

## Security Notes

- All routes (except login/register) require a valid JWT Bearer token
- `@driveit.in` domain enforced at three levels: frontend check, DTO `@Matches`, service runtime check
- Passwords hashed with bcrypt
- CORS configured to allow all origins in dev (`origin: true`) — restrict to company domain in production
- `backend/.env` contains DB password and JWT secret — never commit to git

---

## Roadmap

| Phase | Features | Status |
|---|---|---|
| 1 | Login, nominations, HR/Admin approval, escalation, points wallet | ✅ Done |
| 2 | Points redemption store (vouchers, extra leave) | 🔜 Planned |
| 3 | Leaderboard, analytics charts, Zoho directory integration | 🔜 Planned |
| 4 | Helpdesk tickets, Policy Chatbot, Visitor Management, Email ID Gen | 🔜 Planned |
#   D r i v e - I T - i n t r a d e s k - i n t r a n e t - p r o t a l  
 