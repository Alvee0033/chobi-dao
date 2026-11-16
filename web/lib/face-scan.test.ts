import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { evaluateFacePose } from "./face-scan";

function face(noseX: number): NormalizedLandmark[] {
  const points = Array.from({ length: 455 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
  points[1] = { x: noseX, y: 0.5, z: 0, visibility: 1 };
  points[234] = { x: 0.3, y: 0.5, z: 0, visibility: 1 };
  points[454] = { x: 0.7, y: 0.5, z: 0, visibility: 1 };
  points[10] = { x: 0.5, y: 0.3, z: 0, visibility: 1 };
  points[152] = { x: 0.5, y: 0.7, z: 0, visibility: 1 };
  return points;
}

test("captures only the requested angle", () => {
  assert.equal(evaluateFacePose([face(0.5)], "front").aligned, true);
  assert.equal(evaluateFacePose([face(0.56)], "left").aligned, true);
  assert.equal(evaluateFacePose([face(0.44)], "right").aligned, true);
  assert.equal(evaluateFacePose([face(0.5)], "left").aligned, false);
  assert.equal(evaluateFacePose([face(0.56)], "right").aligned, false);
});

test("requires exactly one visible face", () => {
  assert.equal(evaluateFacePose([], "front").guidance, "no-face");
  assert.equal(evaluateFacePose([face(0.5), face(0.5)], "front").guidance, "multiple-faces");
});

test("rejects a face that is too small", () => {
  const smallFace = face(0.5);
  smallFace[234] = { x: 0.47, y: 0.5, z: 0, visibility: 1 };
  smallFace[454] = { x: 0.53, y: 0.5, z: 0, visibility: 1 };
  assert.equal(evaluateFacePose([smallFace], "front").guidance, "move-closer");
});
