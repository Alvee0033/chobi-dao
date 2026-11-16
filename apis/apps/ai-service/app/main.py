import os
import io
import logging
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

logger = logging.getLogger("ai-service")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Chobi Dao AI Service", version="2.0.0")

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
        data = await file.read()
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid image") from exc

    max_dim = int(os.getenv("MAX_IMAGE_DIM", "2400"))
    if max(image.size) > max_dim:
        scale = max_dim / max(image.size)
        image = image.resize((max(1, round(image.width * scale)), max(1, round(image.height * scale))), Image.Resampling.LANCZOS)

    try:
        return {"faces": detect_faces(image)}
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
    """Detect once on the full image, then on overlapping crops for small group faces."""
    width, height = image.size
    regions = [(0, 0, width, height)]
    if max(width, height) >= 1200:
        tile = min(1200, max(800, round(min(width, height) * 0.65)))
        stride = round(tile * 0.8)
        xs = list(range(0, max(1, width - tile + 1), stride))
        ys = list(range(0, max(1, height - tile + 1), stride))
        xs.append(max(0, width - tile))
        ys.append(max(0, height - tile))
        regions += [(x, y, min(width, x + tile), min(height, y + tile)) for y in sorted(set(ys)) for x in sorted(set(xs))][:12]

    found = []
    for left, top, right, bottom in regions:
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
    return found
