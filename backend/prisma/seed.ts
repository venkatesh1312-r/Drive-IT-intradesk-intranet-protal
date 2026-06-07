import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const empPassword = await bcrypt.hash('employee123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@driveit.com' },
    update: {},
    create: {
      name: 'HR Admin',
      email: 'admin@driveit.com',
      password: adminPassword,
      role: Role.ADMIN,
      points: 0,
    },
  });

  await prisma.user.upsert({
    where: { email: 'employee@driveit.com' },
    update: {},
    create: {
      name: 'Riya Sharma',
      email: 'employee@driveit.com',
      password: empPassword,
      role: Role.EMPLOYEE,
      points: 120,
    },
  });

  console.log('Seed complete. Admin: admin@driveit.com / admin123 | Employee: employee@driveit.com / employee123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
