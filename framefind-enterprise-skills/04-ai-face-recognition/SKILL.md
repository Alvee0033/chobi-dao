---
name: framefind-ai-face-recognition
description: AI and face recognition skill for FrameFind. Use whenever the user asks about InsightFace integration, embedding extraction, similarity thresholds, liveness verification, false positive tuning, or indexing/search quality.
---

# FrameFind AI Face Recognition

## Mission
Deliver high-recall, low-false-positive face matching while preserving privacy and operational efficiency.

## Baseline model and behavior
- Model: InsightFace ArcFace R100, 512-dim normalized embeddings
- Detector: RetinaFace
- Threshold default: cosine similarity >= 0.68
- Max faces indexed per photo: 100

## Liveness constraints
- Client-side challenge only
- Token issuance after challenge pass
- Single-use, short TTL tokens
- Anti-spoof checks required before search

## Tuning workflow
1. Define quality goal (recall vs precision bias).
2. Run threshold sweep (0.60 to 0.85).
3. Measure false positives and missed matches.
4. Recommend threshold and fallback UX copy.
5. Document decision and retest cadence.

## Output format
### AI Quality Report
- Dataset profile:
- Threshold tested:
- Recall:
- False positive rate:
- Recommendation:
- Risk notes:
