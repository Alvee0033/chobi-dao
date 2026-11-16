"use client";

import React, { useState, useEffect } from "react";
import { Icons } from "../icons";

const STEPS = [
  {
    id: 1,
    title: "Scan QR Code",
    description: "Scan the event QR or enter link",
    image: "/images/landing/chobidao-event-hero.png",
    color: "from-orange-400 to-orange-600"
  },
  {
    id: 2,
    title: "Scan Face",
    description: "Take a quick selfie to find you",
    image: "/assets/step2.png",
    color: "from-blue-400 to-blue-600"
  },
  {
    id: 3,
    title: "Download All",
    description: "Get all your photos instantly",
    image: "/assets/step3.png",
    color: "from-green-400 to-green-600"
  }
];

export const MasterpieceHero = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % STEPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto flex w-full max-w-[620px] items-center justify-center px-3 py-8 sm:px-8 sm:py-12">
      <div className="absolute inset-10 rounded-full bg-orange-300/40 blur-[90px]" />
      <div className="relative w-full rotate-1 rounded-[34px] border border-white/80 bg-white/70 p-2.5 shadow-[0_35px_100px_-35px_rgba(106,52,17,0.4)] backdrop-blur-xl sm:rounded-[46px] sm:p-3">
        <div className="relative aspect-[4/4.25] overflow-hidden rounded-[27px] bg-[#24180f] sm:rounded-[36px]">
          <img
            src={STEPS[0].image}
            alt="Guests celebrating together at a warmly lit event"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/20" />
          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/35 bg-black/25 px-3 py-2 text-[10px] font-bold tracking-wide text-white backdrop-blur-xl sm:left-6 sm:top-6 sm:px-4 sm:text-xs">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            LIVE EVENT GALLERY
          </div>
          <div className="absolute bottom-5 left-5 right-5 text-white sm:bottom-8 sm:left-8 sm:right-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/75 sm:text-xs">A night to remember</p>
            <h2 className="text-2xl font-black leading-tight sm:text-4xl">Every moment.<br />Found in a flash.</h2>
          </div>
        </div>
      </div>

      <div className="absolute -left-1 top-[22%] flex -rotate-3 items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_18px_50px_-20px_rgba(30,25,20,.35)] sm:-left-3 sm:rounded-3xl sm:p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl sm:h-12 sm:w-12 sm:rounded-2xl">✨</div>
        <div><p className="text-[9px] font-bold uppercase tracking-wider text-charcoal/45 sm:text-[10px]">Your photos are ready</p><p className="text-xs font-black text-charcoal sm:text-sm">We found 28 moments</p></div>
      </div>
      <div className="absolute -right-1 bottom-[16%] flex rotate-2 items-center gap-3 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_18px_50px_-20px_rgba(30,25,20,.35)] sm:-right-2 sm:rounded-3xl sm:p-4">
        <div className="flex -space-x-2"><span className="h-8 w-8 rounded-full border-2 border-white bg-[#d99962] sm:h-10 sm:w-10"/><span className="h-8 w-8 rounded-full border-2 border-white bg-[#723b2b] sm:h-10 sm:w-10"/><span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-orange-500 text-[9px] font-black text-white sm:h-10 sm:w-10 sm:text-[10px]">+26</span></div>
        <div><p className="text-[9px] font-bold uppercase tracking-wider text-charcoal/45 sm:text-[10px]">Matched just now</p><p className="text-xs font-black text-charcoal sm:text-sm">Private photo pack</p></div>
      </div>
    </div>
  );
};
