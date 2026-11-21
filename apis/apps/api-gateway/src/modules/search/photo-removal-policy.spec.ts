import { guestCanRemoveOriginal } from "./photo-removal-policy";

describe("guest photo removal policy", () => {
  it("permits only indexed photos with exactly one detected face", () => {
    expect(guestCanRemoveOriginal({ indexStatus: "indexed", faceCount: 1 })).toBe(true);
    expect(guestCanRemoveOriginal({ indexStatus: "indexed", faceCount: 2 })).toBe(false);
    expect(guestCanRemoveOriginal({ indexStatus: "uploaded", faceCount: 1 })).toBe(false);
    expect(guestCanRemoveOriginal({ indexStatus: "failed", faceCount: 0 })).toBe(false);
  });
});
