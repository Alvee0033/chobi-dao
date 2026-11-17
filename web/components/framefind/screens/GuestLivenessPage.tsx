import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { useRouter } from "next/navigation";
import { issueLivenessToken, searchPhotos } from "@/lib/api";
import { evaluateFacePose, type FaceGuidance, type ScanStep } from "@/lib/face-scan";
import { saveGuestSearchSession } from "../guest-session";
import { Icons } from "../icons";
import type { ShowToast } from "../types";
import { ClayCard } from "../ui/ClayCard";

type Phase = "init" | "camera" | "scan" | "processing" | "success" | "error";
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

// Subtle pleasant audio chime confirmation for each successful face angle capture
function playCaptureChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    // Upward cheerful chime (587.33Hz D5 -> 880Hz A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may be restricted by autoplay policy
  }
}

export function GuestLivenessPage({ showToast, slug }: { showToast: ShowToast; slug: string }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("chobi.voice_guidance");
      if (cached !== null) return cached === "true";
    }
    return true;
  });
  const voiceEnabledRef = useRef(voiceEnabled);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled((prev) => {
      const next = !prev;
      voiceEnabledRef.current = next;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("chobi.voice_guidance", String(next));
        } catch {}
      }
      if (!next && typeof window !== "undefined") {
        window.speechSynthesis?.cancel();
      }
      return next;
    });
  }, []);
  const [phase, setPhase] = useState<Phase>("init");
  const [startupMessage, setStartupMessage] = useState("Allow camera access to begin");
  const [guideMode, setGuideMode] = useState<"landmarks" | "timed">("landmarks");
  const [errorMessage, setErrorMessage] = useState("");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [guidance, setGuidance] = useState<FaceGuidance>("no-face");
  const [holdProgress, setHoldProgress] = useState(0);

  const speak = useCallback((message: string) => {
    if (!voiceEnabledRef.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";
      
      const play = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha")));
        if (preferred) utterance.voice = preferred;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.getVoices().length > 0) {
        play();
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          play();
        };
        // Fallback immediate call
        window.speechSynthesis.speak(utterance);
      }
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
    let timedStepStart = 0;
    let modelTimedOut = false;
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

    const captureStep = (video: HTMLVideoElement, timestamp: number) => {
      images.push(captureFrame(video));
      setCapturedImages([...images]);
      stepIndex += 1;
      stableSince = 0;
      setHoldProgress(0);
      cooldownUntil = timestamp + 1000;
      timedStepStart = timestamp + 1000;
      playCaptureChime();
      if (stepIndex === captureSteps.length) {
        stopped = true;
        stopCamera();
        void completeFlow(images);
        return;
      }
      setGuidance(stepIndex === 1 ? "turn-left" : "turn-right");
      speak(`Captured. ${captureSteps[stepIndex].instruction}`);
    };

    const timedScanFrame = (timestamp: number) => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        if (!timedStepStart) timedStepStart = timestamp;
        const elapsed = Math.max(0, timestamp - timedStepStart);
        setHoldProgress(Math.min(100, Math.round((elapsed / 3000) * 100)));
        if (elapsed >= 3000) {
          try {
            captureStep(video, timestamp);
            if (stopped) return;
          } catch (error) {
            stopped = true;
            stopCamera();
            setErrorMessage(error instanceof Error ? error.message : "Camera capture failed.");
            setPhase("error");
            return;
          }
        }
      }
      animationFrame = requestAnimationFrame(timedScanFrame);
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
              captureStep(video, timestamp);
              if (stopped) return;
            }
          } else {
            stableSince = 0;
            setHoldProgress(0);
          }
        } catch (error) {
          modelTimedOut = true;
          landmarker?.close();
          landmarker = null;
          setGuideMode("timed");
          setHoldProgress(0);
          speak(`${captureSteps[stepIndex].instruction}. Hold each pose until it captures automatically.`);
          animationFrame = requestAnimationFrame(timedScanFrame);
          return;
        }
      }
      animationFrame = requestAnimationFrame(scanFrame);
    };

    const start = async () => {
      try {
        // Speak instruction right away on page opening
        speak("Please align your face and look straight at the camera.");

        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot access a camera.");
        const cameraRequest = navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        cameraRequest.then((lateStream) => {
          if (stopped) lateStream.getTracks().forEach((track) => track.stop());
        }).catch(() => undefined);
        stream = await Promise.race([
          cameraRequest,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Camera permission took too long. Allow access in your browser and retry.")), 15000)),
        ]);
        if (stopped) { stopCamera(); return; }
        const video = videoRef.current;
        if (!video) throw new Error("Camera preview is unavailable.");
        video.srcObject = stream;
        setPhase("camera");
        setStartupMessage("Camera is on. Loading face guide...");
        await Promise.race([
          video.play(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Camera preview did not start. Please retry.")), 6000)),
        ]);
        const modelRequest = (async () => {
          const vision = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
          return FaceLandmarker.createFromOptions(vision, {
            baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task", delegate: "CPU" },
            runningMode: "VIDEO",
            numFaces: 2,
          });
        })();
        modelRequest.then((model) => {
          if (modelTimedOut || stopped) model.close();
        }).catch(() => undefined);
        landmarker = await Promise.race([
          modelRequest,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Face guide timed out")), 18000)),
        ]);
        if (stopped) { stopCamera(); return; }
        setPhase("scan");
        speak(captureSteps[0].instruction);
        animationFrame = requestAnimationFrame(scanFrame);
      } catch (error) {
        if (stopped) return;
        if (stream && videoRef.current?.readyState && videoRef.current.readyState >= 2) {
          modelTimedOut = true;
          landmarker?.close();
          landmarker = null;
          setGuideMode("timed");
          setPhase("scan");
          speak(`${captureSteps[0].instruction}. Hold each pose until it captures automatically.`);
          animationFrame = requestAnimationFrame(timedScanFrame);
          return;
        }
        stopped = true;
        stopCamera();
        setErrorMessage(error instanceof Error ? error.message : "Camera access failed. Check permission and try again.");
        setPhase("error");
      }
    };

    void start();
    return () => {
      stopped = true;
      stopCamera();
      stopScanRef.current = null;
    };
  }, [slug, router, completeFlow, speak]);

  const currentStep = captureSteps[Math.min(capturedImages.length, 2)];
  const scanning = phase === "scan";
  const aligned = scanning && guideMode === "landmarks" && guidance === "hold-still";

  // SVG circular ring geometry (viewBox 0 0 280 280, radius = 132, stroke = 7)
  const radius = 132;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (holdProgress / 100) * circumference;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col items-center justify-between p-4 sm:p-6 bg-gradient-to-b from-[#FFFDF9] via-[#FAF6F0] to-[#F5EEE6] selection:bg-orange-200 overflow-hidden">
      
      {/* Top Navigation Bar */}
      <header className="w-full max-w-md sm:max-w-xl flex items-center justify-between py-1 z-20 shrink-0">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-orange-600 font-serif font-bold text-xl sm:text-2xl hover:opacity-90 transition-opacity"
        >
          <img src="/logo-mark.webp" alt="Chobi Dao" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
          <span>Chobi dao</span>
        </button>

        {/* Desktop Header Voice Switch */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={toggleVoice}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 active:scale-95 shadow-sm backdrop-blur-md ${
              voiceEnabled
                ? "bg-white/95 border-orange-200 text-orange-700 hover:bg-orange-50"
                : "bg-white/80 border-[#EADECF] text-[#7A6B62] hover:bg-white"
            }`}
            title={voiceEnabled ? "Mute voice guidance" : "Enable voice guidance"}
          >
            {voiceEnabled ? (
              <Icons.Volume2 className="w-4 h-4 text-orange-600" />
            ) : (
              <Icons.VolumeX className="w-4 h-4 text-neutral-400" />
            )}
            <span>Voice Guide</span>
            <div className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 ${voiceEnabled ? "bg-orange-500" : "bg-neutral-300"}`}>
              <div className={`bg-white w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${voiceEnabled ? "translate-x-3" : "translate-x-0"}`} />
            </div>
          </button>

          <button
            onClick={() => router.push(`/e/${encodeURIComponent(slug)}`)}
            className="text-xs font-bold text-[#7A6B62] hover:text-[#2D1807] px-3.5 py-1.5 rounded-xl bg-white/80 border border-[#EADECF] shadow-sm hover:bg-white transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Mobile Header: Clean Cancel Action */}
        <button
          onClick={() => router.push(`/e/${encodeURIComponent(slug)}`)}
          className="sm:hidden text-xs font-bold text-[#7A6B62] hover:text-[#2D1807] px-3 py-1.5 rounded-xl bg-white/80 border border-[#EADECF] shadow-sm active:scale-95 transition-all"
        >
          Cancel
        </button>
      </header>

      {/* Main Verification Card */}
      <ClayCard className="w-full max-w-md text-center flex flex-col items-center p-4 sm:p-7 bg-white/90 backdrop-blur-xl rounded-[32px] border border-white/90 shadow-clay-card relative my-auto shrink-0">
        
        {/* Step Header */}
        <div className="w-full mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-100/70 border border-orange-200/60 px-3 py-1 rounded-full inline-block mb-1.5">
            Face Verification
          </span>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#2D1807] tracking-tight">
            Find your event photos
          </h1>

          {/* Clean 3-Step Pose Indicator */}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold">
            <span className={`px-3 py-1 rounded-full border transition-all ${
              capturedImages.length === 0
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-emerald-100 text-emerald-800 border-emerald-300"
            }`}>
              {capturedImages.length > 0 ? "✓ 1. Front" : "1. Front"}
            </span>
            <span className="text-[#A8988B] text-xs">→</span>
            <span className={`px-3 py-1 rounded-full border transition-all ${
              capturedImages.length === 1
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : capturedImages.length > 1
                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                : "bg-white/60 text-[#7A6B62] border-[#EADECF]"
            }`}>
              {capturedImages.length > 1 ? "✓ 2. Left" : "2. Left"}
            </span>
            <span className="text-[#A8988B] text-xs">→</span>
            <span className={`px-3 py-1 rounded-full border transition-all ${
              capturedImages.length === 2
                ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                : "bg-white/60 text-[#7A6B62] border-[#EADECF]"
            }`}>
              3. Right
            </span>
          </div>
        </div>

        {/* Circular Camera Viewfinder with Live Circular SVG Progress Ring */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 mb-3 flex items-center justify-center shrink-0">
          {/* Live SVG Progress Ring around Viewfinder */}
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none z-20" viewBox="0 0 280 280">
            {/* Background Track Ring */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="#FDE68A"
              strokeWidth="6"
              strokeOpacity="0.4"
            />
            {/* Live Animated Progress Arc */}
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke={aligned ? "#22C55E" : "#F97316"}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-[stroke-dashoffset,stroke] duration-150"
            />
          </svg>

          {/* Camera Oval Frame */}
          <div className="w-[244px] h-[244px] sm:w-[260px] sm:h-[260px] bg-neutral-900 rounded-full shadow-clay-card border-4 border-white/90 overflow-hidden relative flex items-center justify-center">
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
            />
            
            {/* Internal Guide Oval */}
            <div
              className={`absolute inset-3 rounded-full border-2 transition-all duration-300 z-10 ${
                aligned
                  ? "border-green-400 shadow-[0_0_24px_rgba(74,222,128,0.7)] scale-95"
                  : scanning
                  ? "border-amber-400/80 border-dashed animate-pulse"
                  : "border-white/20"
              }`}
            />

            {/* Quick Floating Guide Badge inside camera */}
            {scanning && (
              <div
                className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full text-xs font-bold tracking-wide shadow-md whitespace-nowrap z-20 transition-all ${
                  aligned
                    ? "bg-green-600 text-white ring-2 ring-white/60 animate-bounce"
                    : "bg-black/65 backdrop-blur-md text-white border border-white/20"
                }`}
              >
                {aligned ? "✓ Hold still!" : `${currentStep.label} Angle`}
              </div>
            )}

            {/* Init / Camera Permissions / Processing overlays */}
            {phase === "init" && (
              <div className="absolute inset-0 bg-neutral-950/85 text-white flex flex-col items-center justify-center gap-2.5 z-20 p-5">
                <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-bold text-neutral-200">{startupMessage}</span>
              </div>
            )}

            {phase === "camera" && (
              <div className="absolute inset-x-4 bottom-4 bg-neutral-900/85 backdrop-blur-md text-white rounded-xl px-3 py-2 text-xs font-bold z-20 flex items-center justify-center gap-2 border border-white/10">
                <span className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                <span>{startupMessage}</span>
              </div>
            )}

            {phase === "processing" && (
              <div className="absolute inset-0 bg-white/95 text-orange-600 flex flex-col items-center justify-center gap-2 z-30 p-4">
                <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                <span className="text-sm font-bold text-[#2D1807]">Searching your photos...</span>
                <span className="text-xs text-[#7A6B62]">Comparing against event gallery</span>
              </div>
            )}

            {phase === "success" && (
              <div className="absolute inset-0 bg-white/95 text-green-600 flex flex-col items-center justify-center gap-2 z-30">
                <Icons.CheckCircle className="w-12 h-12" />
                <span className="text-base font-bold text-green-700">Photos Found!</span>
              </div>
            )}

            {phase === "error" && (
              <div className="absolute inset-0 bg-neutral-900/90 text-white flex flex-col items-center justify-center p-4 text-center z-30">
                <span className="text-2xl mb-1">⚠️</span>
                <span className="text-xs font-bold leading-snug">{errorMessage}</span>
              </div>
            )}
          </div>
        </div>

        {/* Single Dedicated Active Direction Banner */}
        <div className="w-full max-w-xs mb-2">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 rounded-2xl p-3 shadow-sm text-center">
            <h2 className="text-sm sm:text-base font-bold text-[#2D1807]" aria-live="polite">
              {currentStep.instruction}
            </h2>
            <div
              className={`mt-1 py-0.5 px-2.5 rounded-lg text-xs font-semibold inline-block transition-all ${
                aligned
                  ? "bg-green-100 text-green-800"
                  : "text-[#7A6B62]"
              }`}
              role="status"
              aria-live="polite"
            >
              {scanning
                ? (guideMode === "timed" ? "Hold pose... Auto-capturing" : guidanceText[guidance])
                : phase === "error"
                ? "Camera blocked — Click 'Retry camera scan' to allow"
                : phase === "camera"
                ? "Starting camera..."
                : "Look straight into the circle"}
            </div>
          </div>
        </div>

        {/* Action Controls: Retry on error */}
        {phase === "error" && (
          <div className="w-full flex flex-col items-center gap-2 mt-1">
            <button
              onClick={() => window.location.reload()}
              className="w-full h-11 sm:h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm rounded-2xl shadow-clay-btn transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              Retry camera scan
            </button>
          </div>
        )}
      </ClayCard>

      {/* Modern Mobile Bottom Utility Bar with Proper SVG Toggle Switch & Privacy Badge */}
      <footer className="w-full max-w-md flex flex-col items-center gap-2 py-1 z-20 shrink-0">
        {/* Mobile Voice Guidance Switch Bar */}
        <div className="sm:hidden w-full flex items-center justify-between px-4 py-2 rounded-2xl bg-white/70 backdrop-blur-md border border-[#EADECF] shadow-sm">
          <div className="flex items-center gap-2.5">
            {voiceEnabled ? (
              <Icons.Volume2 className="w-4 h-4 text-orange-600" />
            ) : (
              <Icons.VolumeX className="w-4 h-4 text-neutral-400" />
            )}
            <span className="text-xs font-bold text-[#2D1807]">Voice Instructions</span>
          </div>

          <button
            type="button"
            onClick={toggleVoice}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 active:scale-95 ${
              voiceEnabled ? "bg-orange-500" : "bg-neutral-300"
            }`}
            aria-label="Toggle voice guidance"
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                voiceEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="text-center text-[11px] text-[#7A6B62] font-medium">
          Photos are matched privately on your device.
        </div>
      </footer>
    </div>
  );
}
