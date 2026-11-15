import { useEffect, useRef, useState, useCallback } from "react";
import { issueLivenessToken, searchPhotos } from "@/lib/api";
import { Icons } from "../icons";
import type { ShowToast } from "../types";
import { ClayCard } from "../ui/ClayCard";
import { useRouter } from "next/navigation";
import { saveGuestSearchSession } from "../guest-session";

type Phase = "init" | "ready" | "scan" | "processing" | "success" | "error";

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

export function GuestLivenessPage({ showToast, slug }: { showToast: ShowToast; slug: string }) {
  const [phase, setPhase] = useState<Phase>("init");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hasFace, setHasFace] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0); // 0 to 100 for auto-capture
  const [faceMeshLoaded, setFaceMeshLoaded] = useState(false);
  const router = useRouter();
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const latestResultsRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const consecutivePassRef = useRef<number>(0);
  const phaseRef = useRef<Phase>("init");

  // Keep ref updated to access inside the requestAnimationFrame loop securely
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    if (!slug) {
      router.replace("/find");
      return;
    }

    const bootCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } }, 
          audio: false 
        });
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
        }

        // Dynamically load MediaPipe from CDN
        try {
          await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js");
          if (typeof window !== "undefined" && (window as any).FaceMesh) {
            const FaceMeshCtor = (window as any).FaceMesh;
            const fm = new FaceMeshCtor({
              locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });
            fm.setOptions({
              maxNumFaces: 1,
              refineLandmarks: true,
              minDetectionConfidence: 0.5,
              minTrackingConfidence: 0.5
            });
            fm.onResults((results: any) => {
              latestResultsRef.current = results;
            });
            faceMeshRef.current = fm;
            setFaceMeshLoaded(true);
          }
        } catch (loaderErr) {
          console.warn("MediaPipe CDN loader failed, using fast fallback trigger mode:", loaderErr);
        }

        setPhase("ready");
      } catch {
        setErrorMessage("Camera access failed. Please check camera permission and try again.");
        setPhase("error");
      }
    };

    bootCamera();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [slug, router]);

  // Capture current canvas frame and trigger search API
  const completeFlow = useCallback(async () => {
    try {
      const video = videoRef.current;
      if (!video) throw new Error("Camera not active");

      setPhase("processing");

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to create canvas context");

      // Apply a mirror flip to match the UI camera preview
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL("image/jpeg", 0.85);

      const liveness = await issueLivenessToken(slug);
      const result = await searchPhotos(slug, liveness.livenessToken, base64Image);
      saveGuestSearchSession(slug, { photos: result.photos, sessionToken: result.sessionToken });
      setPhase("success");
      showToast(`Found ${result.count} matched photos!`);
      setTimeout(() => router.push(`/e/${encodeURIComponent(slug)}/photos`), 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Search failed");
      setPhase("error");
    }
  }, [slug, router, showToast]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fallback: upload selfie from local file or gallery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setPhase("processing");
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      const maxDim = 640;
      let width = img.width;
      let height = img.height;
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);

      const base64Image = canvas.toDataURL("image/jpeg", 0.85);

      const liveness = await issueLivenessToken(slug);
      const result = await searchPhotos(slug, liveness.livenessToken, base64Image);
      saveGuestSearchSession(slug, { photos: result.photos, sessionToken: result.sessionToken });
      setPhase("success");
      showToast(`Found ${result.count} matched photos!`);
      setTimeout(() => router.push(`/e/${encodeURIComponent(slug)}/photos`), 800);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Selfie upload search failed");
      setPhase("error");
    }
  };

  // Capture loop
  useEffect(() => {
    if (!videoRef.current) return;

    let cancelled = false;

    const detectLoop = async () => {
      if (cancelled || !videoRef.current || phaseRef.current !== "scan") return;
      if (videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(detectLoop);
        return;
      }

      try {
        if (faceMeshRef.current) {
          await faceMeshRef.current.send({ image: videoRef.current });
          const results = latestResultsRef.current;
          const face = results?.multiFaceLandmarks?.[0];
          const detected = !!face;
          setHasFace(detected);

          if (detected) {
            // Increase progress quickly when face is in the frame
            setDetectionProgress((prev) => {
              const next = prev + 12; // Complete in about 8-9 frames (~250-300ms)
              if (next >= 100) {
                // Trigger auto-capture
                completeFlow();
                return 100;
              }
              return next;
            });
          } else {
            // Gradually decay detection progress when face leaves
            setDetectionProgress((prev) => Math.max(0, prev - 8));
          }
        } else {
          // Simulation or fast-fallback mode
          setHasFace(true);
          setDetectionProgress((prev) => {
            const next = prev + 10;
            if (next >= 100) {
              completeFlow();
              return 100;
            }
            return next;
          });
        }
      } catch (err) {
        console.error("Auto-capture loop error:", err);
      }

      if (phaseRef.current === "scan" && !cancelled) {
        rafRef.current = requestAnimationFrame(detectLoop);
      }
    };

    rafRef.current = requestAnimationFrame(detectLoop);
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, completeFlow]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 md:p-6 transition-all duration-500 selection:bg-orange-200">
      {/* Brand logo */}
      <button 
        onClick={() => router.push("/")} 
        className="absolute top-6 left-6 flex items-center gap-3 text-orange-600 font-heading font-black text-2xl hover:scale-105 transition-all drop-shadow-sm z-50"
      >
        <img src="/logo.png" alt="Chobi Dao" className="w-9 h-9 object-contain" />
        <span>Chobi dao</span>
      </button>

      <ClayCard className="w-full max-w-md text-center flex flex-col items-center p-6 md:p-8 bg-white/40 backdrop-blur-xl rounded-3xl border border-orange-100/50 shadow-2xl overflow-hidden relative">
        <h2 className="text-2xl md:text-3xl font-black font-heading text-charcoal mb-1 tracking-tight">
          Instant Face Finder
        </h2>
        <p className="text-xs text-muted font-bold mb-6 max-w-xs mx-auto">
          Match your face instantly to view your photo gallery.
        </p>

        {phase === "scan" && (
          <div className="mb-6 text-center w-full animate-fade-in px-2">
            <span className="text-[10px] font-black text-orange-600 bg-orange-100 border border-orange-200/80 px-3 py-1.5 rounded-full uppercase tracking-wider">
              {hasFace ? "Face Detected" : "Aligning Camera"}
            </span>
            <h3 className="text-xl md:text-2xl font-black text-charcoal mt-3 tracking-tight">
              {hasFace ? "Hold still for a moment..." : "Center your face in the circle"}
            </h3>
          </div>
        )}

        {/* Camera Container */}
        <div className="relative w-64 h-64 md:w-72 md:h-72 bg-neutral-900 rounded-full shadow-clay-card border-4 border-white/60 overflow-hidden mb-6 flex items-center justify-center transition-all duration-300">
          <video 
            ref={videoRef} 
            muted 
            playsInline 
            className="absolute inset-0 h-full w-full object-cover scale-x-[-1]" 
          />

          {/* Dynamic ring indicator state */}
          <div 
            className={`absolute inset-0 border-4 rounded-full m-1 transition-all duration-300 z-10 ${
              phase === "success" 
                ? "border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.6)]" 
                : hasFace 
                  ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6)]" 
                  : "border-orange-400/40 border-dashed animate-pulse"
            }`} 
          />

          {/* Loading scripts / Camera boot state */}
          {phase === "init" && (
            <div className="absolute inset-0 bg-neutral-900/90 text-white font-black text-xs flex flex-col items-center justify-center gap-2 z-20">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <div className="uppercase tracking-widest text-[10px] text-orange-400">Starting Camera...</div>
            </div>
          )}

          {phase === "ready" && (
            <div className="absolute inset-0 bg-neutral-900/70 text-white font-black text-xs flex flex-col items-center justify-center gap-2 z-20">
              <Icons.FaceId className="w-10 h-10 text-orange-400 animate-pulse" />
              <div className="uppercase tracking-widest text-[10px]">Ready to scan</div>
            </div>
          )}
          
          {/* Laser scanning beam effect */}
          {phase === "scan" && (
            <>
              <div className="absolute inset-0 overflow-hidden rounded-full z-10 pointer-events-none">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_12px_rgba(249,115,22,0.8)]" />
              </div>
              
              {/* Circular interactive progress bar */}
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="50%"
                    cy="50%"
                    r="47%"
                    stroke="rgba(249, 115, 22, 0.15)"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="50%"
                    cy="50%"
                    r="47%"
                    stroke="url(#progress-gradient)"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 135}`}
                    strokeDashoffset={`${2 * Math.PI * 135 * (1 - detectionProgress / 100)}`}
                    className="transition-all duration-75 ease-out"
                  />
                  <defs>
                    <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </>
          )}

          {/* Processing matching matches state */}
          {phase === "processing" && (
            <div className="absolute inset-0 bg-white/95 text-orange-600 font-bold text-sm flex flex-col items-center justify-center gap-3 z-30 animate-fade-in">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="absolute w-full h-full border-4 border-orange-200 rounded-full" />
                <div className="absolute w-full h-full border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="animate-pulse text-xs tracking-wider uppercase font-black">Matching your photos...</div>
            </div>
          )}

          {/* Matches found state */}
          {phase === "success" && (
            <div className="absolute inset-0 bg-white/90 text-green-600 font-black text-sm flex flex-col items-center justify-center gap-2 z-30 animate-fade-in scale-105">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Icons.CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="uppercase tracking-widest text-xs font-black">Matched!</div>
            </div>
          )}

          {/* Error handling state */}
          {phase === "error" && (
            <div className="absolute inset-0 bg-neutral-900/90 text-red-400 font-bold text-xs flex flex-col items-center justify-center p-6 text-center z-30">
              <div className="w-10 h-10 bg-red-950/50 rounded-full flex items-center justify-center mb-2">
                <span className="text-lg">⚠️</span>
              </div>
              <div>{errorMessage}</div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex flex-col gap-3 relative z-30">
          {/* Hidden file input for gallery upload */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {phase === "ready" && (
            <>
              <button 
                onClick={() => setPhase("scan")} 
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-center gap-2" 
                data-testid="start-scan"
              >
                <Icons.FaceId size={20} />
                Start Face Scan
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-12 bg-white/80 hover:bg-white text-charcoal border border-orange-200/80 rounded-2xl font-black text-xs transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Icons.Upload size={16} className="text-orange-500" />
                Upload Selfie from Photos
              </button>
            </>
          )}

          {phase === "init" && (
            <button disabled className="w-full h-14 bg-orange-100 text-muted/50 rounded-2xl font-black text-sm cursor-not-allowed">
              Booting Camera...
            </button>
          )}

          {phase === "scan" && (
            <button 
              onClick={completeFlow} 
              className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98] animate-pulse flex items-center justify-center gap-2"
            >
              <Icons.Camera size={18} />
              {hasFace ? "Capturing Now..." : "Snap Photo Instantly"}
            </button>
          )}

          {phase === "processing" && (
            <button disabled className="w-full h-14 bg-orange-50 text-orange-400 border border-orange-100 rounded-2xl font-black text-sm cursor-not-allowed flex items-center justify-center gap-2">
              <Icons.Loader size={18} className="text-orange-500" />
              Finding photos...
            </button>
          )}

          {phase === "error" && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-orange-500/25 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Icons.Upload size={18} />
                Upload Selfie Instead
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="w-full h-11 bg-white hover:bg-orange-50 text-charcoal border border-orange-200/80 rounded-2xl font-black text-xs transition-all shadow-sm active:scale-[0.98]"
              >
                Retry Camera
              </button>
            </>
          )}

          <button 
            onClick={() => router.push(`/e/${slug}`)} 
            className="text-xs font-black text-muted/70 hover:text-charcoal transition-colors py-2"
          >
            Cancel
          </button>
        </div>
      </ClayCard>
    </div>
  );
}
