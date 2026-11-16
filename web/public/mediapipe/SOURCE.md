The face guide uses Google MediaPipe Face Landmarker only to position the camera and detect head turns. Photo identity matching is performed by the application's separate search service.

- Model bundle: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task
- Model SHA-256: 64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff
- Web runtime: @mediapipe/tasks-vision 0.10.21, with the matching WASM files copied from that package.
- Model information: https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker?tab=Web

The MediaPipe package and component model cards identify Apache License 2.0. The model and runtime are served locally so the camera guide does not depend on a third-party CDN at scan time.
