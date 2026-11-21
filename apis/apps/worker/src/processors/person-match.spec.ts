// @ts-nocheck
import { choosePersonMatch } from "./person-match";

describe("person cluster assignment", () => {
  it("does not assign a face when the top candidate is ambiguous", () => {
    expect(choosePersonMatch([
      { person_id: "person-a", similarity: 0.72 },
      { person_id: "person-b", similarity: 0.70 },
    ])).toBeNull();
  });

  it("assigns a clear top candidate above the matching threshold", () => {
    expect(choosePersonMatch([
      { person_id: "person-a", similarity: 0.76 },
      { person_id: "person-a", similarity: 0.73 },
      { person_id: "person-b", similarity: 0.62 },
    ])).toBe("person-a");
  });
});
