import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

// OTP login rule (must match auth flow): firstname.initial@driveittech.in
const EMAIL_RULE = /^[a-z]+\.[a-z]@driveittech\.in$/;

async function main() {
  // ── Bootstrap first admin ─────────────────────────────────────────
  // Guarantees there is always a way into the portal. Overridable via env.
  const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin.a@driveittech.in').toLowerCase();
  const adminName = process.env.BOOTSTRAP_ADMIN_NAME || 'Portal Admin';
  if (!EMAIL_RULE.test(adminEmail)) {
    throw new Error(
      `BOOTSTRAP_ADMIN_EMAIL "${adminEmail}" does not match the required format ` +
      `firstname.initial@driveittech.in — this admin would never pass OTP login.`,
    );
  }
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN, status: UserStatus.ACTIVE },
    create: { name: adminName, email: adminEmail, role: Role.ADMIN, status: UserStatus.ACTIVE },
  });
  console.log(`Bootstrap admin ready: ${adminEmail} [ADMIN / ACTIVE]`);

  // ── Dev users (log in via OTP) ────────────────────────────────────
  const seeds = [
    { name: 'Hina Rao',      email: 'hina.r@driveittech.in',   role: Role.HR,       points: 0   },
    { name: 'Ishaan Tiwari', email: 'ishaan.t@driveittech.in', role: Role.IT,       points: 0   },
    { name: 'Riya Sharma',   email: 'riya.s@driveittech.in',   role: Role.EMPLOYEE, points: 120 },
  ];

  const users: Record<string, { id: number }> = {};
  for (const s of seeds) {
    const user = await prisma.user.upsert({
      where:  { email: s.email },
      update: { status: UserStatus.ACTIVE },
      create: { name: s.name, email: s.email, role: s.role, points: s.points, status: UserStatus.ACTIVE },
    });
    users[s.email] = user;
    console.log(`Seeded: ${s.email} [${s.role} / ACTIVE]`);
  }

  const projectNames = ['Atlas', 'Nirapadh', 'Phoenix'];
  for (const name of projectNames) {
    const project = await prisma.project.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: project.id, userId: users['riya.s@driveittech.in'].id } },
      update: {},
      create: { projectId: project.id, userId: users['riya.s@driveittech.in'].id },
    });
    console.log(`Seeded project: ${name}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
