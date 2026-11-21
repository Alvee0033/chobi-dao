import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

const email = (process.argv[2] || "owner@chobidao.internal").trim().toLowerCase();
if (process.argv.length > 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run admin:bootstrap -- [owner-email]");
  process.exit(2);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    if (await prisma.adminAccount.count() > 0) throw new Error("An owner account already exists. Bootstrap is one-time only.");
    const password = randomBytes(30).toString("base64url");
    const owner = await prisma.adminAccount.create({ data: {
      email,
      name: "Chobi Dao Owner",
      passwordHash: await bcrypt.hash(password, 12),
    } });
    await prisma.adminAuditLog.create({ data: {
      adminId: owner.id,
      action: "admin_grant",
      resourceType: "admin_account",
      resourceId: owner.id,
      details: { email },
    } });
    console.log(`Owner email: ${email}`);
    console.log(`Temporary password: ${password}`);
    console.log("Change this password at first sign-in. The temporary password is shown only here.");
  } finally { await prisma.$disconnect(); }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Owner bootstrap failed"); process.exitCode = 1; });
