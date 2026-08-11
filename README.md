# InfraDesk — Unified Internal Portal

> A self-hosted internal platform for **DriveIT Technologies** consolidating HR and IT operations into a single authenticated portal.

---

## What is InfraDesk?

InfraDesk brings multiple internal-ops modules under one login, one sidebar, and one role system (`EMPLOYEE`, `HR`, `ADMIN`, `IT`). Based on the current codebase, the platform now includes:

| Module | Purpose | Status |
|---|---|---|
| **Reward System** | Peer recognition, nominations, points wallet | ✅ Active |
| **Helpdesk / Tickets** | Raise and track IT/HR support tickets | ✅ Active |
| **Visitor Management** | Gate visitor pre-registration, walk-ins, check-in | ✅ Active |
| **Policy Chatbot** | AI-powered HR policy Q&A (RAG over uploaded policy docs) | ✅ Active |
| **Work Log** | Employee work-log entries + admin review | ✅ Active |
| **Projects** | Project/team records used across modules | ✅ Active |
| **Comments** | Threaded comments (tickets, nominations, etc.) | ✅ Active |
| **Notifications** | In-app notification bell / feed | ✅ Active |
| **Audit** | Action audit trail across modules | ✅ Active |
| **User Admin / Settings** | User management, password/OTP flows, settings | ✅ Active |

---

## Repository Layout

```
Drive-IT-intradesk-intranet-portal/
├── backend/                       # NestJS API (core portal: auth, reward, tickets, visitors, etc.)
│   ├── prisma/
│   │   ├── schema.prisma          # All core models + enums
│   │   ├── migrations/            # initial_schema → add_password_auth → add_signup_otp_verified
│   │   └── seed.ts                # Dev seed: admin, hr, employee users
│   ├── scripts/
│   │   └── smtp-doctor.js         # SMTP connectivity/debug helper
│   └── src/
│       ├── auth/                  # Login, register, password auth, OTP, JWT, guards, mailer
│       ├── audit/                 # Audit trail service/module
│       ├── comments/              # Create/edit comment DTOs + controller/service
│       ├── nominations/           # Reward System: CRUD, approve, decline, escalate
│       ├── notifications/         # Notification feed
│       ├── projects/              # Project/team CRUD
│       ├── tickets/               # Helpdesk tickets (create/update DTOs)
│       ├── users/                 # Wallet + profile
│       ├── visitors/              # Visitor pre-registration, walk-in, check-in, reschedule
│       ├── work-log/              # Work log entries + admin views
│       ├── app.module.ts
│       ├── main.ts                # CORS, ValidationPipe
│       └── prisma.service.ts
│
├── chatbot-service/                # Policy Chatbot (Node + Python microservice)
│   ├── config/prisma.js
│   ├── controllers/                # chat_controller, upload_controller
│   ├── middleware/                 # auth, error handling
│   ├── prisma/                     # Postgres + pgvector schema & migration
│   ├── python-microservice/        # LangGraph + guardrails RAG service
│   │   ├── .guardrails/hub_registry.json
│   │   ├── guardrails_service.py
│   │   ├── langgraph_service.py
│   │   ├── main.py
│   │   └── requirements.txt
│   ├── routes/                     # chat_router, upload_router
│   ├── services/                   # chunking, embedding, LLM, PDF, policy, vector search
│   ├── uploads/                    # Uploaded policy source docs (e.g. Code of Conduct PDF)
│   └── server.js
│
├── frontend/                       # Next.js 14 App Router UI
│   ├── public/                     # Logo, GPTW badge
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # Login (split layout, GPTW badge)
│       │   ├── set-password/       # First-login / OTP password set
│       │   ├── dashboard/          # Employee dashboard
│       │   ├── hr/                 # HR-scoped views
│       │   ├── it/                 # IT-scoped views
│       │   └── admin/              # Admin dashboard (all modules, role-scoped)
│       ├── components/
│       │   ├── AiChatbotModule.tsx / AskAiFab.tsx   # Policy Chatbot UI
│       │   ├── DriveITLogo.tsx
│       │   ├── NotificationBell.tsx
│       │   ├── Pagination.tsx
│       │   ├── SettingsModule.tsx
│       │   ├── TimeSelect12.tsx
│       │   ├── UserAdminModule.tsx
│       │   ├── VisitorsModule.tsx
│       │   ├── WorkLogModule.tsx / WorkLogAdminModule.tsx
│       └── lib/api.ts              # API client (all endpoints, abort timeout)
│
├── .gitignore
├── README.md
└── start.ps1                        # Windows helper script to launch services
```

---

## Why the Structure Changed

The original single-module README only documented the **Reward System**. The codebase has since grown into three independently runnable services:

1. **`backend/`** — the core NestJS portal API: auth, reward/nominations, tickets, visitors, work-log, projects, comments, notifications, audit, users.
2. **`chatbot-service/`** — a separate Node service + Python (LangGraph/guardrails) microservice powering the Policy Chatbot, with its own Prisma schema (Postgres + pgvector) and upload pipeline for policy PDFs.
3. **`frontend/`** — one Next.js app whose sidebar now routes into all active modules (`dashboard`, `hr`, `it`, `admin`, plus embedded widgets like the chatbot FAB and notification bell), instead of just the Reward System views.

This README reorganizes the documentation to match: each running service gets its own setup section below, and modules are described by what's actually implemented in `src/`, not just the original roadmap.

---

## Running Locally

### Prerequisites
- Node.js 18+
- Python 3.10+ (for the chatbot microservice)
- PostgreSQL with `pgvector` extension enabled (needed for the chatbot service)

### 1. Backend (core portal API)
```bash
cd backend
npm install
cp .env.example .env        # fill in DB URL, JWT secret, SMTP creds
npx prisma migrate deploy   # applies initial_schema, add_password_auth, add_signup_otp_verified
npm run db:seed             # seed dev users
npm run start:dev           # http://localhost:3001
```

### 2. Chatbot Service (Policy Chatbot)
```bash
cd chatbot-service
npm install
cp .env.example .env
npx prisma migrate deploy   # init_postgres_pgvector
npm run start                # or: node server.js

# Python microservice (RAG/guardrails)
cd python-microservice
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

### 3. Frontend
```bash
cd frontend
npm install
cp .env.example .env        # point at backend + chatbot-service base URLs
npm run dev                 # http://localhost:3000
```

> On Windows, `start.ps1` at the repo root can be used to launch all three services together.

### Dev Login Credentials

| Email | Role |
|---|---|---|
| admin@driveit.in | ADMIN |

---

## Security Notes

- All routes (except login/register/OTP) require a valid JWT Bearer token.
- `@driveit.in` domain enforced at frontend, DTO, and service levels.
- Passwords hashed with bcrypt; password-set flow supports OTP verification (`add_signup_otp_verified` migration).
- CORS is permissive in dev — restrict to the company domain in production.
- `.env` files in `backend/`, `chatbot-service/`, and `frontend/` all contain secrets — never commit them.
- Uploaded policy documents in `chatbot-service/uploads/` may contain sensitive HR content — restrict access accordingly.

---

## Notes for Contributors

- Keep this README's **Repository Layout** section in sync with `src/` — when a new module folder is added under `backend/src/`, `chatbot-service/`, or `frontend/src/components`, add a line here rather than letting the tree drift out of date.
- Each service (`backend`, `chatbot-service`, `frontend`) is independently deployable; document any new inter-service API contract in this file's "Why the Structure Changed" section.