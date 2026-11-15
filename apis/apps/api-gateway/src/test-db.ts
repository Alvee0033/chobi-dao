import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const photographers = await prisma.photographer.findMany();
  console.log("PHOTOGRAPHERS:", JSON.stringify(photographers, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
