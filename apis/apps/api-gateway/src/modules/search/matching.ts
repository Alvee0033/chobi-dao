export const MATCH_CANDIDATE_THRESHOLD = 0.55;
export const MATCH_CONSENSUS_THRESHOLD = 0.60;
export const MATCH_STRONG_THRESHOLD = 0.68;
export const SCAN_CONSISTENCY_THRESHOLD = 0.35;

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

export function acceptedMatch(scores: number[]): boolean {
  return scores.some((score) => score >= MATCH_STRONG_THRESHOLD)
    || scores.filter((score) => score >= MATCH_CONSENSUS_THRESHOLD).length >= 2;
}

export function validateScanEmbeddings(embeddings: number[][]): boolean {
  if (embeddings.length < 1 || embeddings.some((embedding) =>
    embedding.length !== 512 || !embedding.every(Number.isFinite))) return false;
  const first = embeddings[0];
  return embeddings.slice(1).every((embedding) =>
    cosineSimilarity(first, embedding) >= SCAN_CONSISTENCY_THRESHOLD);
}
