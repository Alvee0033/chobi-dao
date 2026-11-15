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
        className="flex items-center justify-between px-4 sm:px-8 py-4 bg-gradient-to-b from-black/80 to-transparent z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-white/80 font-mono text-xs sm:text-sm font-semibold tracking-wider px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10">
            {currentIndex + 1} / {photos.length}
          </span>
          {currentPhoto.similarity && (
            <span className="flex items-center gap-1.5 text-orange-400 font-sans text-xs font-black px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 backdrop-blur-md">
              <Icons.Sparkles size={12} />
              {Math.round(currentPhoto.similarity * 100)}% Match
            </span>
          )}
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zoom */}
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all active:scale-95"
            title={isZoomed ? "Zoom out" : "Zoom in"}
          >
            <Icons.Maximize2 size={16} />
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="h-10 px-4 rounded-full flex items-center gap-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-bold transition-all active:scale-95"
            title="Share Photo"
          >
            {isCopied ? <Icons.Check size={14} className="text-green-400" /> : <Icons.Share2 size={14} />}
            <span className="hidden sm:inline">{isCopied ? "Link Copied!" : "Share"}</span>
          </button>

          {/* Download */}
          <button
            onClick={() => onDownload(currentPhoto.fullUrl, `${slug}-photo-${currentIndex + 1}.jpg`)}
            className="h-10 px-4 sm:px-5 rounded-full flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-lg shadow-orange-500/30 transition-all active:scale-95"
            title="Download HD Photo"
          >
            <Icons.Download size={15} />
            <span>Download HD</span>
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all active:scale-95 ml-2"
            title="Close (Esc)"
          >
            <Icons.X size={18} />
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
          className="absolute left-3 sm:left-6 z-10 w-12 h-12 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/70 border border-white/20 backdrop-blur-md transition-all active:scale-95 hover:scale-105"
          title="Previous photo (←)"
        >
          <Icons.ChevronLeft size={24} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="absolute right-3 sm:right-6 z-10 w-12 h-12 rounded-full flex items-center justify-center text-white bg-black/40 hover:bg-black/70 border border-white/20 backdrop-blur-md transition-all active:scale-95 hover:scale-105"
          title="Next photo (→)"
        >
          <Icons.ChevronRight size={24} />
        </button>

        {/* Display Image */}
        <div
          className={`relative transition-transform duration-300 ease-out cursor-pointer ${
            isZoomed ? "scale-150 cursor-zoom-out" : "max-w-5xl max-h-[75vh] cursor-zoom-in"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(!isZoomed);
          }}
        >
          <img
            src={currentPhoto.fullUrl || currentPhoto.thumbMediumUrl || currentPhoto.thumbUrl}
            alt={`Photo ${currentIndex + 1}`}
            className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl ring-1 ring-white/10 select-none"
            draggable={false}
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
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
