"use client";

import { useEffect, useState, useCallback } from "react";
import { Icons } from "../icons";
import type { SearchPhoto } from "@/lib/api";

type PhotoLightboxProps = {
  photos: SearchPhoto[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload: (url: string, filename: string) => void;
  slug: string;
};

export function PhotoLightbox({
  photos,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onDownload,
  slug,
}: PhotoLightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const currentPhoto = photos[currentIndex];

  const handleNext = useCallback(() => {
    setIsZoomed(false);
    if (currentIndex < photos.length - 1) {
      onNavigate(currentIndex + 1);
    } else {
      onNavigate(0); // loop around
    }
  }, [currentIndex, photos.length, onNavigate]);

  const handlePrev = useCallback(() => {
    setIsZoomed(false);
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    } else {
      onNavigate(photos.length - 1);
    }
  }, [currentIndex, photos.length, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, handleNext, handlePrev, onClose]);

  const handleShare = async () => {
    if (!currentPhoto) return;
    const shareData = {
      title: "My Event Photo",
      text: "Found my photo on Chobi Dao!",
      url: currentPhoto.fullUrl || window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(currentPhoto.fullUrl || window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  if (!isOpen || !currentPhoto) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col justify-between bg-black/95 backdrop-blur-2xl transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      {/* Top Bar */}
      <div
        className="flex items-center justify-between px-3 sm:px-8 py-3 sm:py-4 bg-gradient-to-b from-black/90 via-black/60 to-transparent z-20 shrink-0 gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <span className="text-white/90 font-mono text-xs sm:text-sm font-bold tracking-wider px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 whitespace-nowrap">
            {currentIndex + 1} / {photos.length}
          </span>
          {currentPhoto.similarity && (
            <span className="hidden xs:flex items-center gap-1 text-orange-400 font-sans text-xs font-black px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 backdrop-blur-md whitespace-nowrap">
              <Icons.Sparkles size={11} />
              {Math.round(currentPhoto.similarity * 100)}%
            </span>
          )}
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Zoom */}
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all active:scale-95 shrink-0"
            title={isZoomed ? "Zoom out" : "Zoom in"}
          >
            <Icons.Maximize2 size={15} />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="w-9 h-9 sm:w-auto sm:h-10 sm:px-3.5 rounded-full flex items-center justify-center gap-1.5 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold transition-all active:scale-95 shrink-0"
            title="Share Photo"
          >
            {isCopied ? <Icons.Check size={14} className="text-green-400" /> : <Icons.Share2 size={14} />}
            <span className="hidden sm:inline">{isCopied ? "Copied" : "Share"}</span>
          </button>

          {/* Download */}
          <button
            onClick={() => onDownload(currentPhoto.fullUrl, `${slug}-photo-${currentIndex + 1}.jpg`)}
            className="h-9 sm:h-10 px-3 sm:px-4 rounded-full flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-lg shadow-orange-500/30 transition-all active:scale-95 shrink-0 whitespace-nowrap"
            title="Download HD Photo"
          >
            <Icons.Download size={14} />
            <span className="hidden xs:inline">HD</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all active:scale-95 shrink-0"
            title="Close (Esc)"
          >
            <Icons.X size={17} />
          </button>
        </div>
      </div>

      {/* Main Image Viewport */}
      <div
        className="relative flex-1 flex items-center justify-center p-2 sm:p-6 select-none overflow-hidden"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Navigation Chevrons */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          className="absolute left-2 sm:left-6 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white bg-black/50 hover:bg-black/75 border border-white/20 backdrop-blur-md transition-all active:scale-90"
          title="Previous photo (←)"
        >
          <Icons.ChevronLeft size={20} className="sm:w-6 sm:h-6" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-2 sm:right-6 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white bg-black/50 hover:bg-black/75 border border-white/20 backdrop-blur-md transition-all active:scale-90"
          title="Next photo (→)"
        >
          <Icons.ChevronRight size={20} className="sm:w-6 sm:h-6" />
        </button>

        {/* Display Image */}
        <div
          className={`relative transition-transform duration-300 ease-out cursor-pointer flex items-center justify-center ${
            isZoomed ? "scale-150 cursor-zoom-out" : "max-w-5xl max-h-[70vh] sm:max-h-[75vh] cursor-zoom-in"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
        >
          <img
            src={currentPhoto.fullUrl || currentPhoto.thumbMediumUrl || currentPhoto.thumbUrl}
            alt={`Photo ${currentIndex + 1}`}
            className="max-h-[70vh] sm:max-h-[75vh] w-auto max-w-full object-contain rounded-xl sm:rounded-2xl shadow-2xl ring-1 ring-white/10 select-none"
            draggable={false}
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>

      {/* Bottom Filmstrip */}
      <div
        className="px-4 py-3 bg-gradient-to-t from-black/90 to-transparent flex justify-center z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 overflow-x-auto max-w-2xl py-1 px-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md scrollbar-none">
          {photos.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => {
                setIsZoomed(false);
                onNavigate(idx);
              }}
              className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 transition-all border-2 ${
                idx === currentIndex
                  ? "border-orange-500 scale-110 shadow-lg shadow-orange-500/40 opacity-100 ring-2 ring-orange-500/50"
                  : "border-transparent opacity-50 hover:opacity-80"
              }`}
            >
              <img
                src={p.thumbSmallUrl || p.thumbUrl}
                alt={`Thumb ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
