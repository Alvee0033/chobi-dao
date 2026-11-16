import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useRouter } from "next/navigation";
import { issueLivenessToken, searchPhotos } from "@/lib/api";
import { evaluateFacePose, type FaceGuidance, type ScanStep } from "@/lib/face-scan";
import { saveGuestSearchSession } from "../guest-session";
import { Icons } from "../icons";
import type { ShowToast } from "../types";
import { ClayCard } from "../ui/ClayCard";

type Phase = "init" | "scan" | "processing" | "success" | "error";
const captureSteps: { key: ScanStep; label: string; instruction: string }[] = [
  { key: "front", label: "Front", instruction: "Look straight at the camera" },
  { key: "left", label: "Left", instruction: "Turn your head to your left" },
  { key: "right", label: "Right", instruction: "Turn your head to your right" },
];
const guidanceText: Record<FaceGuidance, string> = {
  "no-face": "Move into the circle so your face is visible",
  "multiple-faces": "Only one person should be in the camera",
  "move-closer": "Move a little closer to the camera",
  "center-face": "Center your face inside the circle",
  "turn-front": "Look straight at the camera",
  "turn-left": "Turn your head a little more to your left",
  "turn-right": "Turn your head a little more to your right",
  "hold-still": "Great. Hold still for a moment",
};

function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Camera capture is unavailable on this device.");
  context.drawImage(video, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function GuestLivenessPage({ showToast, slug }: { showToast: ShowToast; slug: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const voiceEnabledRef = useRef(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [phase, setPhase] = useState<Phase>("init");
  const [errorMessage, setErrorMessage] = useState("");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [guidance, setGuidance] = useState<FaceGuidance>("no-face");
  const [holdProgress, setHoldProgress] = useState(0);

  const speak = useCallback((message: string) => {
    if (!voiceEnabledRef.current || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.94;
      window.speechSynthesis.speak(utterance);
    } catch {
      // The on-screen guidance remains available if the browser blocks speech.
    }
  }, []);

  const completeFlow = useCallback(async (images: string[]) => {
    try {
      setPhase("processing");
      speak("Searching your photos");
      const liveness = await issueLivenessToken(slug);
      const result = await searchPhotos(slug, liveness.livenessToken, images);
      saveGuestSearchSession(slug, {
        photos: result.photos,
        sessionToken: result.sessionToken,
        indexingCount: result.indexingCount,
      });
      setPhase("success");
      showToast(`Found ${result.count} matched photos!`);
      router.push(`/e/${encodeURIComponent(slug)}/photos`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Search failed. Please try again.");
      setPhase("error");
    }
  }, [router, showToast, slug, speak]);

  useEffect(() => {
    if (!slug) {
      router.replace("/find");
      return;
    }

    let stopped = false;
    let animationFrame = 0;
    let stream: MediaStream | null = null;
    let landmarker: FaceLandmarker | null = null;
    let lastSample = 0;
    let lastVideoTime = -1;
    let stableSince = 0;
    let cooldownUntil = 0;
    let stepIndex = 0;
    const images: string[] = [];

    const stopCamera = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      landmarker?.close();
      landmarker = null;
      window.speechSynthesis?.cancel();
    };
    stopScanRef.current = () => {
      stopped = true;
      stopCamera();
    };

    const scanFrame = (timestamp: number) => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && landmarker && timestamp - lastSample >= 200 && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
        lastSample = timestamp;
        lastVideoTime = video.currentTime;
        try {
          const result = landmarker.detectForVideo(video, timestamp);
          const evaluation = evaluateFacePose(result.faceLandmarks, captureSteps[stepIndex].key);
          setGuidance(evaluation.guidance);
          if (evaluation.aligned && timestamp >= cooldownUntil) {
            if (!stableSince) stableSince = timestamp;
            const elapsed = timestamp - stableSince;
            setHoldProgress(Math.min(100, Math.round((elapsed / 800) * 100)));
            if (elapsed >= 800) {
              images.push(captureFrame(video));
              setCapturedImages([...images]);
              stepIndex += 1;
              stableSince = 0;
              setHoldProgress(0);
              cooldownUntil = timestamp + 1000;
              if (stepIndex === captureSteps.length) {
                stopped = true;
                stopCamera();
                void completeFlow(images);
                return;
              }
              setGuidance(stepIndex === 1 ? "turn-left" : "turn-right");
              speak(`Captured. ${captureSteps[stepIndex].instruction}`);
            }
          } else {
            stableSince = 0;
            setHoldProgress(0);
          }
        } catch (error) {
          stopped = true;
          stopCamera();
          setErrorMessage(error instanceof Error ? error.message : "Camera scan failed.");
          setPhase("error");
          return;
        }
      }
      animationFrame = requestAnimationFrame(scanFrame);
    };

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access a camera.");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (stopped) { stopCamera(); return; }
        const video = videoRef.current;
        if (!video) throw new Error("Camera preview is unavailable.");
        video.srcObject = stream;
        await video.play();
        const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 2,
        });
        if (stopped) { stopCamera(); return; }
        setPhase("scan");
        speak(captureSteps[0].instruction);
        animationFrame = requestAnimationFrame(scanFrame);
      } catch (error) {
        stopCamera();
        if (!stopped) {
          setErrorMessage(error instanceof Error ? error.message : "Camera access failed. Check permission and try again.");
          setPhase("error");
        }
      }
    };

    void start();
    return () => {
      stopped = true;
      stopCamera();
      stopScanRef.current = null;
    };
  }, [slug, router, completeFlow, speak]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setErrorMessage("Choose an image under 10 MB.");
      setPhase("error");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    try {
      stopScanRef.current?.();
      setPhase("processing");
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Could not read the selected image."));
        image.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 640 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not process the selected image.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      await completeFlow([canvas.toDataURL("image/jpeg", 0.85)]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Selfie search failed.");
      setPhase("error");
    } finally {
      URL.revokeObjectURL(objectUrl);
      event.target.value = "";
    }
  };

  const currentStep = captureSteps[Math.min(capturedImages.length, 2)];
  const scanning = phase === "scan";
  const aligned = scanning && guidance === "hold-still";

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 md:p-6 selection:bg-orange-200">
      <button onClick={() => router.push("/")} className="absolute top-6 left-6 flex items-center gap-3 text-orange-600 font-heading font-black text-2xl z-50">
        <img src="/logo.png" alt="Chobi Dao" className="w-9 h-9 object-contain" />
        <span>Chobi dao</span>
      </button>

      <ClayCard className="w-full max-w-md text-center flex flex-col items-center p-6 md:p-8 bg-white/40 backdrop-blur-xl rounded-3xl border border-orange-100/50 shadow-2xl relative">
        <h1 className="text-2xl md:text-3xl font-black font-heading text-charcoal mb-1 tracking-tight">Find your photos</h1>
        <p className="text-sm text-muted font-semibold mb-5 max-w-xs">Keep your face in the circle. The camera captures each angle automatically.</p>

        <div className="flex items-center gap-2 mb-5" aria-label={`${capturedImages.length} of 3 views captured`}>
          {captureSteps.map((step, index) => (
            <div key={step.key} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black border ${
              index < capturedImages.length ? "bg-green-100 text-green-700 border-green-200" :
              index === capturedImages.length && scanning ? "bg-orange-100 text-orange-700 border-orange-300" :
              "bg-white/80 text-muted border-orange-100"
            }`}>
              {index < capturedImages.length ? <Icons.CheckCircle size={14} /> : <span>{index + 1}</span>}
              {step.label}
            </div>
          ))}
        </div>

        <div className="relative w-64 h-64 md:w-72 md:h-72 bg-neutral-900 rounded-full shadow-clay-card border-4 border-white/60 overflow-hidden mb-5 flex items-center justify-center">
          <video ref={videoRef} muted playsInline autoPlay className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" />
          <div className={`absolute inset-1 rounded-full border-4 transition-colors duration-200 z-10 ${
            aligned ? "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]" : "border-orange-400/70 border-dashed"
          }`} />
          {scanning && <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-neutral-900/75 text-white rounded-full px-3 py-1.5 text-[11px] font-black whitespace-nowrap z-20">
            {aligned ? "Hold still" : currentStep.label + " view"}
          </div>}
          {phase === "init" && <div className="absolute inset-0 bg-neutral-900/90 text-white flex flex-col items-center justify-center gap-3 z-20">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-black">Preparing camera and face guide...</span>
          </div>}
          {phase === "processing" && <div className="absolute inset-0 bg-white/95 text-orange-600 flex flex-col items-center justify-center gap-3 z-30">
            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <span className="text-sm font-black">Searching your photos...</span>
          </div>}
          {phase === "success" && <div className="absolute inset-0 bg-white/95 text-green-600 flex flex-col items-center justify-center gap-2 z-30">
            <Icons.CheckCircle className="w-12 h-12" />
            <span className="text-sm font-black">Photos found</span>
          </div>}
          {phase === "error" && <div className="absolute inset-0 bg-neutral-900/90 text-white flex flex-col items-center justify-center p-5 text-center z-30">
            <span className="text-3xl mb-2">⚠️</span>
            <span className="text-sm font-bold">{errorMessage}</span>
          </div>}
        </div>

        {scanning && <>
          <h2 className="text-xl font-black text-charcoal mb-1" aria-live="polite">{currentStep.instruction}</h2>
          <p className={`text-sm font-bold min-h-10 ${
            aligned ? "text-green-700" : "text-orange-700"
          }`} role="status" aria-live="polite">{guidanceText[guidance]}</p>
          <div className="w-full h-2.5 bg-orange-100 rounded-full overflow-hidden mb-4" role="progressbar" aria-label="Hold still progress" aria-valuenow={holdProgress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-green-500 rounded-full transition-[width] duration-200" style={{ width: `${holdProgress}%` }} />
          </div>
        </>}

        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
        {(scanning || phase === "error") && <div className="w-full flex flex-col gap-2">
          {scanning && <button type="button" onClick={() => {
            const enabled = !voiceEnabled;
            voiceEnabledRef.current = enabled;
            setVoiceEnabled(enabled);
            if (enabled) speak(currentStep.instruction);
            else window.speechSynthesis?.cancel();
          }} className="self-center text-xs font-bold text-orange-700 underline underline-offset-2 py-1" aria-pressed={voiceEnabled}>
            {voiceEnabled ? "Voice guidance on" : "Turn on voice guidance"}
          </button>}
          <button onClick={() => fileInputRef.current?.click()} className="w-full h-12 bg-white/80 hover:bg-white text-charcoal border border-orange-200 rounded-2xl font-black text-xs flex items-center justify-center gap-2">
            <Icons.Upload size={16} className="text-orange-500" /> Use a selfie instead
          </button>
          {phase === "error" && <button onClick={() => window.location.reload()} className="w-full h-12 bg-orange-500 text-white rounded-2xl font-black text-sm">Retry camera scan</button>}
        </div>}
        <button onClick={() => router.push(`/e/${encodeURIComponent(slug)}`)} className="text-xs font-black text-muted hover:text-charcoal py-3 mt-2">Cancel</button>
      </ClayCard>
    </div>
  );
}
