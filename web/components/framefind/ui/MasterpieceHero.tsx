"use client";

import React, { useState, useEffect } from "react";
import { Icons } from "../icons";

const STEPS = [
  {
    id: 1,
    title: "Scan QR Code",
    description: "Scan the event QR or enter link",
    image: "/assets/step1.png",
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
    <div className="relative w-full h-[350px] sm:h-[500px] lg:h-[650px] flex items-center justify-center">
      {/* Background Glow */}
      <div className={`absolute inset-0 transition-all duration-1000 blur-[80px] sm:blur-[120px] opacity-20 bg-gradient-to-br ${STEPS[currentStep].color}`} />

      {/* Main Container */}
      <div className="relative w-full max-w-[320px] sm:max-w-md lg:max-w-2xl aspect-square flex items-center justify-center">
        {STEPS.map((step, index) => {
          const isActive = index === currentStep;
          return (
            <div
              key={step.id}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out transform
                ${isActive ? "opacity-100 scale-100 rotate-0 translate-y-0 z-20" : "opacity-0 scale-90 -rotate-6 translate-y-8 lg:translate-y-12 z-10"}`}
            >
              {/* Premium Clay Frame - Reduced padding and borders */}
              <div className="w-full h-full p-1.5 sm:p-2 bg-white rounded-[32px] sm:rounded-[48px] shadow-clay-puffy border-[2px] sm:border-[4px] border-white relative overflow-hidden group">
                {/* Image Component - Maximize space */}
                <div className="w-full h-full rounded-[26px] sm:rounded-[42px] overflow-hidden bg-gray-50 relative border border-charcoal/5">
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Step Badge */}
                  <div className={`absolute top-4 left-4 sm:top-6 sm:left-6 px-3 py-1 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl bg-white shadow-clay-card flex items-center gap-2 sm:gap-3 border border-white/50 z-30`}>
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-[8px] sm:text-[10px] font-black`}>
                      {step.id}
                    </div>
                    <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-charcoal">{step.title}</span>
                  </div>
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-6 left-6 right-6 sm:bottom-10 sm:left-10 sm:right-10 p-3 sm:p-6 bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white shadow-clay-card transform translate-y-2 group-hover:translate-y-0 transition-transform">
                   <p className="text-[10px] sm:text-sm font-bold text-muted leading-tight">{step.description}</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Progress Indicators */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex gap-3 z-30">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className={`h-2 rounded-full transition-all duration-500 
                ${i === currentStep ? "w-12 bg-orange-500 shadow-clay-btn" : "w-2 bg-charcoal/10 hover:bg-charcoal/20"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
