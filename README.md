# Reward & Nomination Module — DRIVEIT HR System

A full-stack HR module for employee nominations and reward points.

## Tech Stack
- **Frontend**: Next.js 14 (App Router)
- **Backend**: NestJS
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Auth**: JWT + bcrypt

## Project Structure
```
reward-nomination-module/
├── backend/        # NestJS API
└── frontend/       # Next.js app
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL running locally

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

## API Endpoints

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | /api/auth/register | Register user | Public |
| POST | /api/auth/login | Login, get JWT | Public |
| POST | /api/nominations | Submit nomination | EMPLOYEE |
| GET | /api/nominations/mine | My nominations | EMPLOYEE |
| GET | /api/nominations | All nominations | ADMIN |
| GET | /api/nominations/stats | Summary counts | ADMIN |
| PATCH | /api/nominations/:id/approve | Approve + award pts | ADMIN |
| PATCH | /api/nominations/:id/decline | Decline nomination | ADMIN |
| GET | /api/users/wallet | My points balance | EMPLOYEE |

## Nomination Categories
- Above & Beyond
- Team Player
- Innovation
- Client Impact
- Mentorship

## Roadmap
- **Phase 1** (current): Nominations, admin approval, points awarded
- **Phase 2**: Points wallet UI, redemption store (Swiggy, Amazon, Zomato, extra leave)
- **Phase 3**: Leaderboard, manager endorsements, analytics dashboard
