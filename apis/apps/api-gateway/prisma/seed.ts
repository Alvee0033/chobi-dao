import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@framefind.app";
  const passwordHash = await bcrypt.hash("password123", 12);

  const photographer = await prisma.photographer.upsert({
    where: { email },
    update: {
      googleAccessToken: "mock-access-token",
      googleRefreshToken: "mock-refresh-token",
      driveRootFolderId: "mock-drive-root-folder-id"
    },
    create: {
      email,
      name: "Demo Photographer",
      passwordHash,
      plan: "pro",
      googleAccessToken: "mock-access-token",
      googleRefreshToken: "mock-refresh-token",
      driveRootFolderId: "mock-drive-root-folder-id"
    }
  });

  await prisma.event.upsert({
    where: { slug: "demo-event" },
    update: {},
    create: {
      photographerId: photographer.id,
      slug: "demo-event",
      name: "Demo Event",
      status: "active"
    }
  });
}

main().finally(() => prisma.$disconnect());
