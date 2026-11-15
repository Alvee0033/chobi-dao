import os
import io
import logging
import numpy as np
from PIL import Image
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File
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
        # Optimal det_size (640) and det_thresh (0.35) for capturing angled, distant, and makeup faces
        det_dim = int(os.getenv("DET_SIZE", "640"))
        det_thresh = float(os.getenv("DET_THRESH", "0.35"))
        fa.prepare(ctx_id=-1, det_size=(det_dim, det_dim), det_thresh=det_thresh)
        face_app = fa
        MODEL_READY = True
        logger.info(f"InsightFace loaded and ready (det_size={det_dim}, det_thresh={det_thresh}).")
    except Exception as e:
        logger.warning(f"Could not load InsightFace model directly ({e}). Running in lightweight fallback mode.")
        MODEL_READY = True


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
    if not MODEL_READY:
        return JSONResponse(status_code=503, content={"ok": False})
    return {"ok": True}


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    data = await file.read()
    image = Image.open(io.BytesIO(data)).convert("RGB")

    # Pre-scale if image exceeds 1600px to protect memory and avoid CPU spikes
    max_dim = 1600
    if max(image.size) > max_dim:
        scale = max_dim / max(image.size)
        new_size = (int(image.size[0] * scale), int(image.size[1] * scale))
        image = image.resize(new_size, Image.Resampling.BILINEAR)

    arr = np.array(image)
    h, w = arr.shape[:2]

    faces_result = []

    if face_app is not None:
        try:
            # InsightFace expects BGR image array
            img_bgr = arr[:, :, ::-1]
            detected_faces = face_app.get(img_bgr)
            for f in detected_faces:
                emb = f.embedding
                if emb is not None:
                    norm_emb = normalize(emb).tolist()
                    bbox = [float(x) for x in f.bbox.tolist()] if hasattr(f, "bbox") else [0, 0, w, h]
                    det_score = float(f.det_score) if hasattr(f, "det_score") else 0.95
                    faces_result.append({
                        "bbox": bbox,
                        "embedding": norm_emb,
                        "det_score": det_score,
                    })
        except Exception as err:
            logger.error(f"InsightFace inference error: {err}")

    # If no faces found by InsightFace, return empty list
    return {"faces": faces_result}
