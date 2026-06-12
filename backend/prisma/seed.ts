import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const seeds = [
    { name: 'HR Admin',      email: 'admin@driveit.in',    password: 'admin123',    role: Role.ADMIN,    points: 0   },
    { name: 'HR Officer',    email: 'hr@driveit.in',       password: 'hr123',       role: Role.HR,       points: 0   },
    { name: 'Riya Sharma',   email: 'employee@driveit.in', password: 'employee123', role: Role.EMPLOYEE, points: 120 },
  ];

  for (const s of seeds) {
    const hashed = await bcrypt.hash(s.password, 10);
    await prisma.user.upsert({
      where:  { email: s.email },
      update: {},
      create: { name: s.name, email: s.email, password: hashed, role: s.role, points: s.points },
    });
    console.log(`Seeded: ${s.email} / ${s.password} [${s.role}]`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
