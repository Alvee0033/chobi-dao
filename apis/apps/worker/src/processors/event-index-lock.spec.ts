// @ts-nocheck
import { lockEventForFaceIndex } from "./event-index-lock";

describe("face indexing event lock", () => {
  it("executes the PostgreSQL void advisory lock without decoding it as a result row", async () => {
    const db = { $executeRaw: jest.fn().mockResolvedValue(1) };
    await expect(lockEventForFaceIndex(db, "event-id")).resolves.toBeUndefined();
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
  });
});
