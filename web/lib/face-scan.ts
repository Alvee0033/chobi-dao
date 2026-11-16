import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type ScanStep = "front" | "left" | "right";
export type FaceGuidance = "no-face" | "multiple-faces" | "move-closer" | "center-face" | "turn-front" | "turn-left" | "turn-right" | "hold-still";

export function evaluateFacePose(faces: NormalizedLandmark[][], step: ScanStep): { aligned: boolean; guidance: FaceGuidance } {
  if (faces.length === 0) return { aligned: false, guidance: "no-face" };
  if (faces.length !== 1) return { aligned: false, guidance: "multiple-faces" };

  const landmarks = faces[0];
  const nose = landmarks[1];
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  if (!nose || !leftCheek || !rightCheek || !forehead || !chin) return { aligned: false, guidance: "no-face" };

  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  const faceHeight = Math.abs(chin.y - forehead.y);
  if (faceWidth < 0.21 || faceHeight < 0.25) return { aligned: false, guidance: "move-closer" };

  const centerX = (leftCheek.x + rightCheek.x) / 2;
  const centerY = (forehead.y + chin.y) / 2;
  if (Math.abs(centerX - 0.5) > 0.17 || Math.abs(centerY - 0.5) > 0.19) {
    return { aligned: false, guidance: "center-face" };
  }

  // The camera frame is unmirrored. A subject turning left moves the nose
  // toward increasing image x, even though the preview is mirrored in CSS.
  const yaw = (nose.x - centerX) / faceWidth;
  if (step === "front" && Math.abs(yaw) > 0.075) return { aligned: false, guidance: "turn-front" };
  if (step === "left" && yaw < 0.11) return { aligned: false, guidance: "turn-left" };
  if (step === "right" && yaw > -0.11) return { aligned: false, guidance: "turn-right" };
  return { aligned: true, guidance: "hold-still" };
}
