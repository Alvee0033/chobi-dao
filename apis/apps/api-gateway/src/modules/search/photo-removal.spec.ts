import { UnauthorizedException } from "@nestjs/common";
import { SearchService } from "./search.service";

describe("guest photo removal", () => {
  const photoId = "00000000-0000-4000-8000-000000000010";
  const eventId = "00000000-0000-4000-8000-000000000020";
  const session = { id: "00000000-0000-4000-8000-000000000030", eventId, expiresAt: new Date(Date.now() + 60_000), matchedPhotoIds: [photoId], matchedScores: [0.9] };
  const fixture = (photo: { id: string; indexStatus: string; faceCount: number } | null) => {
    const tx = {
      photo: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      photoRemovalRequest: { upsert: jest.fn() },
      event: { update: jest.fn() },
      guestSession: { findMany: jest.fn().mockResolvedValue([{ id: session.id, matchedPhotoIds: [photoId], matchedScores: [0.9] }]), update: jest.fn() },
    };
    const prisma = {
      event: { findUnique: jest.fn().mockResolvedValue({ id: eventId }) },
      guestSession: { findUnique: jest.fn().mockResolvedValue(session) },
      photo: { findFirst: jest.fn().mockResolvedValue(photo) },
      photoRemovalRequest: { upsert: jest.fn().mockResolvedValue({ status: "pending" }) },
      $transaction: jest.fn((operation: (client: typeof tx) => unknown) => operation(tx)),
    };
    return { service: new SearchService(prisma as any), prisma, tx };
  };

  it("soft-deletes a matched, indexed single-face original and removes it from active guest sessions", async () => {
    const { service, tx } = fixture({ id: photoId, indexStatus: "indexed", faceCount: 1 });
    const result = await service.requestPhotoRemoval("event", "session-token", photoId);
    expect(result.status).toBe("removed");
    expect(tx.photo.updateMany).toHaveBeenCalledWith({ where: { id: photoId, deletedAt: null }, data: { deletedAt: expect.any(Date) } });
    expect(tx.photoRemovalRequest.upsert).toHaveBeenCalled();
    expect(tx.event.update).toHaveBeenCalledWith({ where: { id: eventId }, data: { totalPhotos: { decrement: 1 }, indexedPhotos: { decrement: 1 } } });
    expect(tx.guestSession.update).toHaveBeenCalledWith({ where: { id: session.id }, data: { matchedPhotoIds: [], matchedScores: [] } });
  });

  it("routes group shots to owner review instead of deleting the original", async () => {
    const { service, prisma, tx } = fixture({ id: photoId, indexStatus: "indexed", faceCount: 3 });
    await expect(service.requestPhotoRemoval("event", "session-token", photoId)).resolves.toEqual({ status: "review_requested" });
    expect(prisma.photoRemovalRequest.upsert).toHaveBeenCalled();
    expect(tx.photo.updateMany).not.toHaveBeenCalled();
  });

  it("does not decrement event counts twice when a solo photo was already removed", async () => {
    const { service, tx } = fixture({ id: photoId, indexStatus: "indexed", faceCount: 1 });
    tx.photo.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.requestPhotoRemoval("event", "session-token", photoId)).resolves.toMatchObject({ status: "removed" });
    expect(tx.event.update).not.toHaveBeenCalled();
    expect(tx.photoRemovalRequest.upsert).not.toHaveBeenCalled();
  });

  it("rejects expired, unrelated, or non-matching gallery sessions", async () => {
    const { service, prisma } = fixture({ id: photoId, indexStatus: "indexed", faceCount: 1 });
    prisma.guestSession.findUnique.mockResolvedValue({ ...session, matchedPhotoIds: [] });
    await expect(service.requestPhotoRemoval("event", "session-token", photoId)).rejects.toBeInstanceOf(UnauthorizedException);
    prisma.guestSession.findUnique.mockResolvedValue({ ...session, expiresAt: new Date(Date.now() - 1000) });
    await expect(service.requestPhotoRemoval("event", "session-token", photoId)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("processes a selected batch only when every photo belongs to the active guest session", async () => {
    const secondPhotoId = "00000000-0000-4000-8000-000000000011";
    const { service, prisma } = fixture({ id: photoId, indexStatus: "indexed", faceCount: 1 });
    prisma.guestSession.findUnique.mockResolvedValue({ ...session, matchedPhotoIds: [photoId, secondPhotoId] });
    jest.spyOn(service, "requestPhotoRemoval").mockImplementation(async (_slug, _token, id) => ({ status: id === photoId ? "removed" : "review_requested" }));
    await expect(service.requestPhotoRemovals("event", "session-token", [photoId, secondPhotoId, photoId])).resolves.toEqual({
      results: [{ photoId, status: "removed" }, { photoId: secondPhotoId, status: "review_requested" }],
    });
    prisma.guestSession.findUnique.mockResolvedValue(session);
    await expect(service.requestPhotoRemovals("event", "session-token", [photoId, secondPhotoId])).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
