import os
import io
import logging
import warnings
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger("ai-service")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Chobi Dao AI Service", version="2.0.0")
MAX_ANALYZE_BYTES = int(os.getenv("MAX_ANALYZE_BYTES", str(32 * 1024 * 1024)))
Image.MAX_IMAGE_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", "40000000"))

MODEL_READY = False
face_app = None


def normalize(vec: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(vec)
    return vec if norm == 0 else vec / norm


@app.on_event("startup")
def startup_event():
    global face_app, MODEL_READY
    try:
        import onnxruntime as ort
        from insightface.app import FaceAnalysis

        # Strict CPU thread limits to prevent hogging the host server
        session_options = ort.SessionOptions()
        session_options.intra_op_num_threads = int(os.getenv("ORT_INTRA_THREADS", "2"))
        session_options.inter_op_num_threads = int(os.getenv("ORT_INTER_THREADS", "1"))
        session_options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL

        model_name = os.getenv("INSIGHTFACE_MODEL", "buffalo_s")
        logger.info(f"Loading InsightFace model ({model_name}) with CPU execution provider...")

        # ONLY load detection and recognition (skips landmark_2d, landmark_3d, genderage to save ~40% RAM)
        fa = FaceAnalysis(
            name=model_name,
            allowed_modules=["detection", "recognition"],
            providers=["CPUExecutionProvider"],
            session_options=session_options,
        )
        # Optimal det_size (320-480) for high accuracy with minimal CPU load
        det_dim = int(os.getenv("DET_SIZE", "480"))
        fa.prepare(ctx_id=-1, det_size=(det_dim, det_dim))
        face_app = fa
        MODEL_READY = True
        logger.info("InsightFace loaded and ready.")
    except Exception as e:
        logger.error("InsightFace model is unavailable: %s", e)
        MODEL_READY = False


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "ai-service",
        "modelReady": MODEL_READY,
        "engine": "insightface" if face_app is not None else "fallback",
    }


@app.get("/ready")
def ready():
    if not MODEL_READY or face_app is None:
        return JSONResponse(status_code=503, content={"ok": False})
    return {"ok": True}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    if face_app is None:
        raise HTTPException(status_code=503, detail="Face model unavailable")
    try:
        data = await file.read(MAX_ANALYZE_BYTES + 1)
        if len(data) > MAX_ANALYZE_BYTES:
            raise HTTPException(status_code=413, detail="Image is too large")
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
        raise HTTPException(status_code=400, detail="Invalid image") from exc
    finally:
        await file.close()

    max_dim = int(os.getenv("MAX_IMAGE_DIM", "2400"))
    if max(image.size) > max_dim:
        scale = max_dim / max(image.size)
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)

    try:
        return {"faces": await run_in_threadpool(detect_faces, image)}
    except Exception as exc:
        logger.exception("Face inference failed")
        raise HTTPException(status_code=503, detail="Face analysis failed") from exc


def _iou(a, b):
    left, top = max(a[0], b[0]), max(a[1], b[1])
    right, bottom = min(a[2], b[2]), min(a[3], b[3])
    intersection = max(0, right - left) * max(0, bottom - top)
    area_a = max(0, a[2] - a[0]) * max(0, a[3] - a[1])
    area_b = max(0, b[2] - b[0]) * max(0, b[3] - b[1])
    return intersection / (area_a + area_b - intersection) if area_a + area_b > intersection else 0


def detect_faces(image: Image.Image):
    """Run one fast full-frame pass and refine small-face images with four overlapping crops."""
    width, height = image.size
    found = []
    def scan(region):
        left, top, right, bottom = region
        crop = image.crop((left, top, right, bottom))
        for face in face_app.get(np.array(crop)[:, :, ::-1]):
            embedding = getattr(face, "embedding", None)
            if embedding is None or not np.isfinite(embedding).all() or np.linalg.norm(embedding) == 0:
                raise ValueError("Face detector returned an invalid embedding")
            bbox = [float(face.bbox[0] + left), float(face.bbox[1] + top), float(face.bbox[2] + left), float(face.bbox[3] + top)]
            score = float(getattr(face, "det_score", 0.0))
            candidate = {"bbox": bbox, "embedding": normalize(embedding).tolist(), "det_score": score}
            match_index = next((i for i, previous in enumerate(found) if _iou(previous["bbox"], bbox) >= 0.45), None)
            if match_index is None:
                found.append(candidate)
            elif score > found[match_index]["det_score"]:
                found[match_index] = candidate
    scan((0, 0, width, height))

    # Portraits with a confidently detected large face need no crop passes.
    # Group and distant-face images get a 2x2 refinement pass to recover small faces.
    face_area = max((max(0, face["bbox"][2] - face["bbox"][0]) * max(0, face["bbox"][3] - face["bbox"][1]) for face in found), default=0)
    if max(width, height) >= 1200 and (not found or face_area / max(1, width * height) < 0.08):
        tile_width = min(width, max(800, round(width * 0.68)))
        tile_height = min(height, max(800, round(height * 0.68)))
        x_positions = sorted({0, max(0, width - tile_width)})
        y_positions = sorted({0, max(0, height - tile_height)})
        for top in y_positions:
            for left in x_positions:
                scan((left, top, left + tile_width, top + tile_height))
    return found
