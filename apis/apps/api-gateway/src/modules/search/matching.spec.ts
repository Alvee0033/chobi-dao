import { acceptedMatch, cosineSimilarity, validateScanEmbeddings } from "./matching";

describe("face match decision", () => {
  it("does not admit a weak or single ambiguous match", () => {
    expect(acceptedMatch([0.59, 0.57, 0.12])).toBe(false);
    expect(acceptedMatch([0.63])).toBe(false);
  });

  it("admits a strong match or independent agreement from two views", () => {
    expect(acceptedMatch([0.70, 0.10, 0.11])).toBe(true);
    expect(acceptedMatch([0.61, 0.62, 0.10])).toBe(true);
  });

  it("compares scan views by normalized similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([1, 0], [0])).toBe(0);
  });

  it("rejects scan views that are not consistently the same person", () => {
    const frontal = [1, ...Array(511).fill(0)];
    const unrelated = [0, 1, ...Array(510).fill(0)];
    expect(validateScanEmbeddings([frontal, unrelated])).toBe(false);
    expect(validateScanEmbeddings([frontal, frontal])).toBe(true);
  });
});
