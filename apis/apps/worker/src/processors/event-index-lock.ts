type AdvisoryLockExecutor = {
  $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<number>;
};

export async function lockEventForFaceIndex(db: AdvisoryLockExecutor, eventId: string) {
  // pg_advisory_xact_lock returns void, so use executeRaw to discard its result.
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`;
}
