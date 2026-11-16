import unittest
from types import SimpleNamespace

import numpy as np
from PIL import Image

from app import main


class TileDetector:
    def get(self, image):
        # Simulate a small face that the full-frame detector misses.
        if image.shape[1] > 1200 or image.shape[0] > 1200:
            return []
        mask = image[:, :, 0] > 240
        ys, xs = np.where(mask)
        if not len(xs):
            return []
        return [SimpleNamespace(
            bbox=np.array([xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]),
            embedding=np.ones(512, dtype=np.float32),
            det_score=0.9,
        )]


class FaceDetectionTests(unittest.TestCase):
    def test_overlapping_tiles_recover_and_deduplicate_small_face(self):
        original = main.face_app
        main.face_app = TileDetector()
        try:
            image = Image.new("RGB", (1600, 1600), "black")
            image.paste("white", (790, 790, 830, 830))
            faces = main.detect_faces(image)
            self.assertEqual(len(faces), 1)
            self.assertEqual(faces[0]["bbox"], [790.0, 790.0, 830.0, 830.0])
            self.assertAlmostEqual(np.linalg.norm(faces[0]["embedding"]), 1.0)
        finally:
            main.face_app = original


if __name__ == "__main__":
    unittest.main()
