import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || process.argv.length !== 3) {
  console.error("Usage: pnpm admin:grant <verified-account-email>");
  process.exit(2);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const account = await prisma.photographer.findUnique({ where: { email }, select: { id: true, emailVerified: true, systemRole: true } });
    if (!account) throw new Error("Photographer account not found");
    if (!account.emailVerified) throw new Error("Account email must be verified before admin grant");
    if (account.systemRole === "admin") throw new Error("Account is already an admin; grant is one-time");
    await prisma.$transaction([
      prisma.photographer.update({ where: { id: account.id }, data: { systemRole: "admin" } }),
      prisma.adminAuditLog.create({ data: { adminId: account.id, action: "admin_grant", resourceType: "photographer", resourceId: account.id, details: { email } } }),
    ]);
    console.log(`Granted admin access to verified account ${email}`);
  } finally { await prisma.$disconnect(); }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Admin grant failed"); process.exitCode = 1; });
