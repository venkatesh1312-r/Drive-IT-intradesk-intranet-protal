import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Signup email rule (must match auth flow): firstname.initial@driveittech.in
const EMAIL_RULE = /^[a-z]+\.[a-z]@driveittech\.in$/;

async function main() {
  // ── Bootstrap first admin slot ──────────────────────────────────────
  // Self-signup always defaults new accounts to EMPLOYEE (an admin has to
  // promote from there), so there needs to be exactly one pre-existing
  // row with role=ADMIN for someone to actually sign up into. This seed
  // creates ONLY that bare slot — email + role — everything else (name,
  // password) stays null exactly like a normal pre-signup row, so the
  // person goes through the real Sign Up flow (email OTP -> verify ->
  // set name + password) to activate it. signupComplete() preserves this
  // pre-set ADMIN role instead of defaulting it to EMPLOYEE.
  //
  // No other employees are seeded — everyone else signs up from scratch.
  const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin.a@driveittech.in').toLowerCase();
  if (!EMAIL_RULE.test(adminEmail)) {
    throw new Error(
      `BOOTSTRAP_ADMIN_EMAIL "${adminEmail}" does not match the required format ` +
      `firstname.initial@driveittech.in — this admin would never pass signup.`,
    );
  }

  // Mirror the same placeholder-name convention signup step 1 uses
  // ("priya.s@driveittech.in" -> "Priya S") since `name` is a required
  // field — it can be updated later from the profile/settings screen.
  const local = adminEmail.split('@')[0];
  const placeholderName = local.split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

  // This admin slot skips the OTP signup flow entirely — it's seeded as an
  // already-ACTIVE account with a default password so itdocker compose up -d frontend can log in right
  // away. The default password should be changed after first login.
  const defaultPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || 'Admin@123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // don't touch it if it already exists (e.g. password already changed)
    create: {
      email: adminEmail,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      name: placeholderName,
      passwordHash,
    },
  });

  console.log(`Bootstrap admin ready: ${adminEmail} [role: ADMIN, status: ACTIVE]`);
  console.log(`Default password: ${defaultPassword} — please log in and change it immediately.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());