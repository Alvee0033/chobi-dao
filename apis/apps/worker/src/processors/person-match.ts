export type PersonCandidate = { person_id: string; similarity: number };

export function choosePersonMatch(
  candidates: PersonCandidate[],
  minSimilarity = 0.56,
  minMargin = 0.04,
): string | null {
  const totals = new Map<string, { total: number; count: number }>();
  for (const row of candidates) {
    if (!row.person_id || !Number.isFinite(row.similarity)) continue;
    const current = totals.get(row.person_id) ?? { total: 0, count: 0 };
    totals.set(row.person_id, { total: current.total + row.similarity, count: current.count + 1 });
  }
  const ranked = [...totals.entries()]
    .map(([personId, value]) => ({ personId, average: value.total / value.count }))
    .sort((a, b) => b.average - a.average);
  if (!ranked.length || ranked[0].average < minSimilarity) return null;
  if (ranked[1] && ranked[0].average - ranked[1].average < minMargin) return null;
  return ranked[0].personId;
}
