import { PrismaClient, Role, UserStatus } from '@prisma/client';

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
  // field — it gets overwritten with the real name at signup completion.
  const local = adminEmail.split('@')[0];
  const placeholderName = local.split('.').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {}, // don't touch it if it already exists (e.g. already signed up)
    create: {
      email: adminEmail,
      role: Role.ADMIN,
      status: UserStatus.AWAITING_APPROVAL,
      // name is a placeholder, same as any fresh row from signup step 1 —
      // passwordHash etc. all stay null until signup is completed.
      name: placeholderName,
    },
  });

  console.log(`Bootstrap admin slot ready: ${adminEmail} [role: ADMIN, awaiting signup]`);
  console.log('Go to Sign Up with this email to verify via OTP and set your name + password.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
