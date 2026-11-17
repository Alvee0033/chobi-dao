"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Icons } from "../icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";

// Persona type for Live Interactive Demo
interface DemoPersona {
  id: string;
  name: string;
  role: string;
  avatar: string;
  photosCount: number;
  confidence: string;
  speed: string;
  matches: {
    id: string;
    src: string;
    title: string;
    matchScore: string;
    tag: string;
  }[];
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: "ayesha",
    name: "Ayesha Rahman",
    role: "Sister of the Bride",
    avatar: "/images/landing/step-selfie.webp",
    photosCount: 8,
    confidence: "99.8%",
    speed: "0.38s",
    matches: [
      {
        id: "m1",
        src: "/images/hero/wedding.png",
        title: "Stage Ceremony & Laughs",
        matchScore: "99.8%",
        tag: "Stage Portrait"
      },
      {
        id: "m2",
        src: "/images/hero/user_wedding.jpg",
        title: "Family Blessing Moment",
        matchScore: "99.4%",
        tag: "Candid"
      },
      {
        id: "m3",
        src: "/images/hero/user_wedding_2.jpg",
        title: "Dance Floor Celebration",
        matchScore: "98.9%",
        tag: "Reception"
      }
    ]
  },
  {
    id: "farhan",
    name: "Farhan Chowdhury",
    role: "Groom's Best Friend",
    avatar: "/images/landing/step-find.webp",
    photosCount: 6,
    confidence: "99.6%",
    speed: "0.32s",
    matches: [
      {
        id: "m4",
        src: "/images/hero/user_wedding_2.jpg",
        title: "Groom Squad Toast",
        matchScore: "99.6%",
        tag: "Reception"
      },
      {
        id: "m5",
        src: "/images/hero/wedding.png",
        title: "Grand Entrance Procession",
        matchScore: "99.1%",
        tag: "Entrance"
      },
      {
        id: "m6",
        src: "/images/hero/concert.png",
        title: "Afterparty Celebration",
        matchScore: "98.7%",
        tag: "Afterparty"
      }
    ]
  },
  {
    id: "nadia",
    name: "Dr. Nadia Karim",
    role: "Keynote Speaker",
    avatar: "/images/landing/step-scan.webp",
    photosCount: 5,
    confidence: "99.9%",
    speed: "0.41s",
    matches: [
      {
        id: "m7",
        src: "/images/hero/corporate.png",
        title: "Mainstage Keynote Address",
        matchScore: "99.9%",
        tag: "Keynote"
      },
      {
        id: "m8",
        src: "/images/hero/corporate.png",
        title: "VIP Executive Panel",
        matchScore: "99.5%",
        tag: "Panel"
      },
      {
        id: "m9",
        src: "/images/hero/corporate.png",
        title: "Fireside Networking",
        matchScore: "98.9%",
        tag: "Networking"
      }
    ]
  }
];

// FAQ item structure
interface FaqItem {
  id: string;
  category: "all" | "guests" | "photographers" | "tech";
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "faq-privacy",
    category: "guests",
    question: "How does face search work without saving my face?",
    answer:
      "When you take a 2-second selfie, Chobi Dao uses MediaPipe and WebAssembly to extract a temporary mathematical embedding vector (512 float values) entirely inside your web browser. Your actual photo is never stored on the server or logged into any database. The mathematical key is 100% ephemeral and permanently discarded when your browser session closes."
  },
  {
    id: "faq-raw",
    category: "photographers",
    question: "Can I upload 5,000+ RAW or high-res photos for a large wedding?",
    answer:
      "Yes! Chobi Dao is engineered specifically for professional event volumes. You can upload thousands of full-resolution JPEG and RAW files. Our background vector indexing processes them concurrently across distributed workers without freezing your browser or degrading image fidelity."
  },
  {
    id: "faq-lighting",
    category: "tech",
    question: "How does guest QR scanning work in low-light banquet halls or dance floors?",
    answer:
      "Every generated QR standee features high-contrast optical padding optimized for low-lux smartphone camera lenses. The web scanner also includes built-in exposure compensation. Furthermore, guests can simply enter your short event link (e.g., chobidao.com/e/your-event) directly on any device."
  },
  {
    id: "faq-app",
    category: "guests",
    question: "Do guests need to download an app or create an account?",
    answer:
      "Zero app installation and zero account creation required! Guests simply point their standard iPhone or Android camera at the table QR standee, take a selfie in Safari or Chrome, and their private photo gallery loads in less than a second."
  },
  {
    id: "faq-speed",
    category: "photographers",
    question: "How fast are photos delivered during a live wedding or summit?",
    answer:
      "Photos become searchable within seconds of being uploaded. Photographers often upload highlight batches during dinner or cocktail hour so guests can find, download, and share high-res memories to Instagram while the party is still in full swing."
  },
  {
    id: "faq-download",
    category: "tech",
    question: "Can guests download full original resolution files without watermarks?",
    answer:
      "Yes. Photographers have granular control over download permissions: you can offer original full-resolution files, custom branded watermarks, or direct one-tap cloud sync to Google Drive and device camera rolls."
  }
];

export function LandingPage() {
  // Live Demo state
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("ayesha");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanComplete, setScanComplete] = useState<boolean>(true);

  // Pricing toggle state: monthly vs per-event
  const [billingCycle, setBillingCycle] = useState<"event" | "annual">("event");

  // FAQ state
  const [activeFaqCategory, setActiveFaqCategory] = useState<string>("all");
  const [openFaqId, setOpenFaqId] = useState<string | null>("faq-privacy");

  const currentPersona =
    DEMO_PERSONAS.find((p) => p.id === selectedPersonaId) || DEMO_PERSONAS[0];

  // Trigger simulated scan
  const handleSimulateScan = (personaId: string) => {
    setSelectedPersonaId(personaId);
    setIsScanning(true);
    setScanComplete(false);
    setTimeout(() => {
      setIsScanning(false);
      setScanComplete(true);
    }, 450);
  };

  const filteredFaqs =
    activeFaqCategory === "all"
      ? FAQS
      : FAQS.filter(
          (f) => f.category === activeFaqCategory || f.category === "all"
        );

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2D1807] font-sans selection:bg-[#E65A15] selection:text-white relative overflow-x-hidden flex flex-col">
      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION                                                         */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#FAF6F0]/90 backdrop-blur-md border-b border-[#F0E6D8]/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#E65A15]/40 flex items-center justify-center text-[#E65A15] bg-[#FAF6F0] shadow-sm group-hover:scale-105 transition-transform">
              <Icons.Camera size={20} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-black text-xl sm:text-2xl text-[#2D1807] tracking-tight leading-none">
                Chobi Dao
              </span>
              <span className="text-[10px] font-bold text-[#E65A15] tracking-widest uppercase mt-0.5">
                AI Photo Discovery
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-7">
            <a
              href="#how-it-works"
              className="text-[#5C4D43] hover:text-[#E65A15] font-bold text-sm tracking-wide transition-colors"
            >
              How it works
            </a>
            <a
              href="#live-demo"
              className="text-[#5C4D43] hover:text-[#E65A15] font-bold text-sm tracking-wide transition-colors flex items-center gap-1.5"
            >
              <span>Live Demo</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E65A15]"></span>
              </span>
            </a>
            <a
              href="#the-moments"
              className="text-[#5C4D43] hover:text-[#E65A15] font-bold text-sm tracking-wide transition-colors"
            >
              Experience
            </a>
            <a
              href="#pricing"
              className="text-[#5C4D43] hover:text-[#E65A15] font-bold text-sm tracking-wide transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-[#5C4D43] hover:text-[#E65A15] font-bold text-sm tracking-wide transition-colors"
            >
              FAQ
            </a>
          </nav>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/auth" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm" className="font-bold text-xs sm:text-sm">
                Photographers
              </Button>
            </Link>
            <Link href="/find">
              <Button
                variant="gradient"
                size="default"
                className="shadow-clay-btn gap-2 text-xs sm:text-sm font-bold"
              >
                <Icons.Image size={16} className="shrink-0" strokeWidth={2.2} />
                <span className="hidden sm:inline">Find my photos</span>
                <span className="sm:hidden">Find photos</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ========================================================================= */}
        {/* 2. FULL DESKTOP HERO WITH SMOOTH ENTRANCE MICRO-INTERACTIONS              */}
        {/* ========================================================================= */}
        <section className="relative min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] flex items-center justify-center overflow-hidden py-10 lg:py-0">
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-amber-200/30 rounded-full blur-[110px] pointer-events-none -z-10" />
          <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-orange-200/25 rounded-full blur-[110px] pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              
              {/* Image Column: Appears FIRST on mobile, Right on Desktop */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
                className="w-full lg:col-span-6 order-1 lg:order-2 flex justify-center items-center relative"
              >
                <div className="relative w-full max-w-[390px] sm:max-w-[480px] lg:max-w-[540px]">
                  {/* Subtle decorative backing glow */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-amber-300/30 via-orange-200/25 to-transparent rounded-[2.5rem] blur-2xl -z-10" />

                  {/* High Quality Hero Graphic */}
                  <Image
                    src="/images/landing/hero-match-flow.webp"
                    alt="Scan event QR code, take a selfie, and find all matching event photos instantly"
                    width={540}
                    height={480}
                    priority
                    className="w-full h-auto object-contain drop-shadow-[0_24px_45px_rgba(110,65,30,0.16)] transform hover:scale-[1.015] transition-transform duration-300"
                  />

                  {/* Interactive Micro Floating Badge: Fast Match (HeroUI style) */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                    className="absolute -bottom-4 sm:-bottom-6 left-2 sm:-left-4 bg-white/95 backdrop-blur-md border border-[#EADECF] rounded-2xl p-3 sm:p-3.5 shadow-[0_16px_36px_rgba(70,35,15,0.15)] flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#E65A15] shrink-0">
                      <Icons.Sparkles size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-bold text-[#2D1807]">
                          14 photos matched in 0.38s
                        </span>
                      </div>
                      <p className="text-[11px] text-[#7A6B62] font-semibold mt-0.5">
                        MediaPipe 3D Landmark • 99.8% precision
                      </p>
                    </div>
                  </motion.div>

                  {/* Top-Right Floating Privacy Badge */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="absolute -top-3 right-0 sm:-right-3 bg-white/90 backdrop-blur-md border border-[#EADECF] rounded-full px-3 py-1 shadow-sm flex items-center gap-1.5 text-[11px] font-bold text-[#2D1807]"
                  >
                    <Icons.Lock size={12} className="text-[#E65A15]" />
                    <span>100% Client-Side Privacy</span>
                  </motion.div>
                </div>
              </motion.div>

              {/* Text & Actions Column: Appears SECOND on mobile, Left on Desktop */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="w-full lg:col-span-6 order-2 lg:order-1 relative z-10 text-center lg:text-left"
              >
                {/* Instant Badge */}
                <Badge
                  variant="glow"
                  size="default"
                  dot
                  className="mb-4 sm:mb-6 uppercase tracking-wider text-[11px]"
                >
                  <Icons.Sparkles size={13} className="shrink-0" />
                  <span>Next-Gen Event Photo Discovery</span>
                </Badge>

                <h1 className="text-3xl sm:text-5xl lg:text-[3.75rem] font-serif font-black text-[#2D1807] leading-[1.12] tracking-tight">
                  Your event photos.<br />
                  Found by your{" "}
                  <span className="relative inline-block whitespace-nowrap text-[#E65A15]">
                    face.
                    <svg
                      className="absolute -bottom-1 sm:-bottom-2 left-0 w-full overflow-visible"
                      height="12"
                      viewBox="0 0 110 12"
                      fill="none"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M2 9C32 2 78 2 108 8"
                        stroke="#E65A15"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </h1>

                <p className="mt-4 sm:mt-6 text-[#5C4D43] text-sm sm:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                  Scan your event&apos;s QR code, take a 2-second selfie, and let our on-device AI instantly locate every high-resolution photo you appear in. No app install needed.
                </p>

                {/* Hero CTA Buttons */}
                <div className="mt-7 sm:mt-9 flex flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full">
                  <Link href="/find" className="flex-1 sm:flex-none">
                    <Button
                      variant="gradient"
                      size="xl"
                      className="w-full sm:w-auto shadow-clay-btn gap-2 text-sm sm:text-base"
                    >
                      <Icons.Image size={18} className="shrink-0" strokeWidth={2.2} />
                      <span>Find my photos</span>
                    </Button>
                  </Link>

                  <a href="#live-demo" className="flex-1 sm:flex-none">
                    <Button
                      variant="clay"
                      size="xl"
                      className="w-full sm:w-auto gap-2 text-sm sm:text-base"
                    >
                      <Icons.Sparkles size={18} className="shrink-0 text-[#E65A15]" strokeWidth={2} />
                      <span>Try Live Demo</span>
                    </Button>
                  </a>
                </div>

                {/* Quick Trust Signals */}
                <div className="mt-8 pt-6 border-t border-[#F0E6D8]/80 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-[#7A6B62] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Icons.CheckCircle size={15} className="text-[#E65A15]" />
                    <span>Zero app install</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icons.CheckCircle size={15} className="text-[#E65A15]" />
                    <span>0.4s private matching</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icons.CheckCircle size={15} className="text-[#E65A15]" />
                    <span>Full-res RAW / JPEG</span>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>

          {/* Desktop Scroll Indicator */}
          <a
            href="#live-demo"
            className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 flex-col items-center gap-1 text-[#7A6B62] hover:text-[#E65A15] transition-colors group cursor-pointer"
            aria-label="Scroll to interactive demo"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#7A6B62]/80 group-hover:text-[#E65A15]">
              Scroll to explore
            </span>
            <div className="w-5 h-8 rounded-full border-2 border-[#EADECF] group-hover:border-[#E65A15] flex items-start justify-center p-1 transition-colors">
              <div className="w-1.5 h-2 bg-[#E65A15] rounded-full animate-bounce" />
            </div>
          </a>
        </section>

        {/* ========================================================================= */}
        {/* 3. METRIC TICKER & VALUE BAR (AlignUI / HeroUI inspired stats)            */}
        {/* ========================================================================= */}
        <section className="py-8 bg-white/60 border-y border-[#F0E6D8]/70 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-8 items-center text-center">
              
              <div className="p-3">
                <div className="font-serif font-black text-3xl sm:text-4xl text-[#E65A15] tracking-tight">
                  99.8%
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#2D1807] mt-1">
                  Match Accuracy
                </div>
                <div className="text-[11px] text-[#7A6B62] font-medium mt-0.5">
                  MediaPipe 468 landmark points
                </div>
              </div>

              <div className="p-3">
                <div className="font-serif font-black text-3xl sm:text-4xl text-[#2D1807] tracking-tight">
                  0.38s
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#2D1807] mt-1">
                  Retrieval Speed
                </div>
                <div className="text-[11px] text-[#7A6B62] font-medium mt-0.5">
                  Sub-second vector indexing
                </div>
              </div>

              <div className="p-3">
                <div className="font-serif font-black text-3xl sm:text-4xl text-[#E65A15] tracking-tight">
                  100%
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#2D1807] mt-1">
                  Ephemeral Privacy
                </div>
                <div className="text-[11px] text-[#7A6B62] font-medium mt-0.5">
                  0 bytes stored on server
                </div>
              </div>

              <div className="p-3">
                <div className="font-serif font-black text-3xl sm:text-4xl text-[#2D1807] tracking-tight">
                  50k+
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#2D1807] mt-1">
                  Celebration Photos
                </div>
                <div className="text-[11px] text-[#7A6B62] font-medium mt-0.5">
                  Weddings, summits & galas
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 4. LIVE DEMO INTERACTIVE CARD (Instant Experience Simulator)             */}
        {/* ========================================================================= */}
        <section id="live-demo" className="py-16 sm:py-24 relative bg-[#FAF6F0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Section Header */}
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="glow" size="default" dot className="mb-3 uppercase tracking-wider">
                <Icons.Sparkles size={13} />
                <span>Interactive Experience</span>
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-serif font-black text-[#2D1807] tracking-tight">
                Try the 0.4-Second Magic Live
              </h2>
              <p className="mt-3 text-[#5C4D43] text-sm sm:text-base max-w-xl mx-auto font-medium">
                Select a guest persona below to simulate how our client-side AI scans the selfie key and surfaces their personal album in a fraction of a second.
              </p>

              {/* Persona Selector Tabs (DaisyUI style) */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                {DEMO_PERSONAS.map((persona) => {
                  const isActive = persona.id === selectedPersonaId;
                  return (
                    <button
                      key={persona.id}
                      onClick={() => handleSimulateScan(persona.id)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                        isActive
                          ? "bg-[#2D1807] text-[#FAF6F0] shadow-md scale-105"
                          : "bg-white/80 hover:bg-white text-[#5C4D43] border border-[#EADECF]"
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-[#E65A15]" />
                      <span>{persona.name}</span>
                      <span className="text-[11px] opacity-75">({persona.role})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interactive Simulator Card Display */}
            <Card variant="clay" className="max-w-5xl mx-auto p-6 sm:p-8 lg:p-10 relative overflow-hidden">
              <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
                
                {/* Left: Selfie Scanner Viewfinder Mockup */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-[280px] sm:max-w-[310px] bg-[#2D1807] rounded-3xl p-4 text-white shadow-2xl relative">
                    {/* Phone Header Indicator */}
                    <div className="flex items-center justify-between pb-3 text-xs text-[#FAF6F0]/70">
                      <span className="font-semibold">Event Camera</span>
                      <Badge variant="glow" size="sm" dot>LIVE</Badge>
                    </div>

                    {/* Viewfinder Target */}
                    <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border-2 border-orange-500/40 flex items-center justify-center">
                      <Image
                        src={currentPersona.avatar}
                        alt={currentPersona.name}
                        width={280}
                        height={350}
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          isScanning ? "scale-105 brightness-110 filter" : ""
                        }`}
                      />

                      {/* Scanning Laser Beam */}
                      {isScanning && (
                        <motion.div
                          initial={{ top: "0%" }}
                          animate={{ top: ["0%", "100%", "0%"] }}
                          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E65A15] to-transparent shadow-[0_0_15px_#E65A15]"
                        />
                      )}

                      {/* Optical Corner Brackets */}
                      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-[#E65A15]" />
                      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-[#E65A15]" />
                      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-[#E65A15]" />
                      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-[#E65A15]" />

                      {/* Scanning status banner */}
                      <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md rounded-xl p-2 text-center text-[11px] font-bold">
                        {isScanning ? (
                          <span className="text-amber-400 flex items-center justify-center gap-1.5">
                            <Icons.Sparkles size={12} className="animate-spin" />
                            Calculating 512-D vectors...
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center justify-center gap-1.5">
                            <Icons.CheckCircle size={12} />
                            Key generated: {currentPersona.speed}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Scanner Action Button */}
                    <div className="mt-4">
                      <Button
                        onClick={() => handleSimulateScan(currentPersona.id)}
                        disabled={isScanning}
                        variant="gradient"
                        size="default"
                        className="w-full text-xs font-bold"
                      >
                        <Icons.FaceId size={16} className="mr-1.5" />
                        <span>{isScanning ? "Scanning..." : "Re-scan Guest Selfie"}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right: Retrieved Photos Showcase */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#EADECF]">
                      <div>
                        <h3 className="font-serif font-black text-xl sm:text-2xl text-[#2D1807]">
                          {currentPersona.name}&apos;s Album
                        </h3>
                        <p className="text-xs text-[#5C4D43] font-semibold mt-0.5">
                          Found {currentPersona.photosCount} photos in {currentPersona.speed} • {currentPersona.confidence} match confidence
                        </p>
                      </div>
                      <Badge variant="success" size="sm" dot>
                        Verified Match
                      </Badge>
                    </div>

                    {/* Matched Photos Mini Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5">
                      {currentPersona.matches.map((photo) => (
                        <div
                          key={photo.id}
                          className="group relative rounded-2xl overflow-hidden border border-[#EADECF] bg-white shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="aspect-[4/3] relative overflow-hidden bg-stone-100">
                            <Image
                              src={photo.src}
                              alt={photo.title}
                              width={220}
                              height={165}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {/* Score Chip */}
                            <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                              {photo.matchScore}
                            </div>
                            <div className="absolute bottom-2 right-2 bg-orange-500/90 text-white px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">
                              {photo.tag}
                            </div>
                          </div>
                          <div className="p-2.5 flex items-center justify-between bg-white">
                            <span className="text-[11px] font-bold text-[#2D1807] truncate">
                              {photo.title}
                            </span>
                            <Icons.Download size={13} className="text-[#E65A15] shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Technical Explainer Note */}
                    <div className="mt-6 p-4 rounded-2xl bg-[#F7F1E6] border border-[#E9DDCE] flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-[#E65A15] shrink-0 mt-0.5">
                        <Icons.Lock size={16} />
                      </div>
                      <div className="text-xs text-[#5C4D43] leading-relaxed">
                        <strong className="text-[#2D1807] font-bold block mb-0.5">
                          Zero biometric storage guarantee
                        </strong>
                        No facial imagery leaves this browser session. MediaPipe creates ephemeral math embeddings, executes cosine-similarity search against indexed event keys, and immediately discards the search token upon departure.
                      </div>
                    </div>
                  </div>

                  {/* Simulator Footer CTA */}
                  <div className="mt-6 pt-4 border-t border-[#EADECF] flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#7A6B62]">
                      Want this effortless experience for your upcoming event?
                    </span>
                    <Link href="/auth">
                      <Button variant="default" size="sm" className="gap-1.5 text-xs font-bold">
                        <span>Setup Event in 30 Seconds</span>
                        <Icons.ChevronRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </div>

              </div>
            </Card>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 5. HOW IT WORKS ("Scan • Selfie • Find")                                  */}
        {/* ========================================================================= */}
        <section id="how-it-works" className="py-16 sm:py-24 relative bg-[#FAF6F0] border-t border-[#F0E6D8]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Centered Heading */}
            <div className="text-center mb-14 sm:mb-20">
              <div className="inline-flex items-center justify-center gap-3">
                <span className="text-[#E65A15] text-2xl font-serif select-none">~</span>
                <h2 className="text-2xl sm:text-4xl lg:text-[2.5rem] font-serif font-black text-[#2D1807] tracking-tight">
                  It&apos;s simple: Scan • Selfie • Find
                </h2>
                <span className="text-[#E65A15] text-2xl font-serif select-none">~</span>
              </div>
              <p className="mt-3 text-[#5C4D43] text-sm sm:text-base max-w-md mx-auto font-medium">
                No sifting through 2,000 photos of strangers. 3 friction-free steps and your memories are in your hands.
              </p>
            </div>

            {/* 3 Step Cards Grid with Modern Card & Badge components */}
            <div className="grid md:grid-cols-3 gap-8 lg:gap-10 items-stretch relative max-w-5xl mx-auto">
              
              {/* Step 01 */}
              <div className="relative flex flex-col items-center group">
                <div className="relative w-full max-w-[280px]">
                  {/* Step Top Pill Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EADECF] shadow-sm rounded-full px-3.5 py-0.5">
                    <span className="w-4 h-4 rounded-full bg-[#E65A15] text-white text-[10px] font-bold flex items-center justify-center">01</span>
                    <span className="text-[11px] font-bold text-[#2D1807] uppercase tracking-wider">Scan</span>
                  </div>

                  {/* Card Container */}
                  <Card variant="clay" className="p-3.5 pt-4 group-hover:shadow-[0_16px_36px_rgba(230,90,21,0.12)] transition-shadow">
                    <div className="rounded-2xl overflow-hidden aspect-square bg-[#FAF6F0] relative">
                      <Image
                        src="/images/landing/step-scan.webp"
                        alt="Scan the event QR"
                        width={280}
                        height={280}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Card>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[240px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Scan the event QR
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1.5 leading-snug font-medium">
                    Point your camera at the table standee or digital invite provided by the photographer.
                  </p>
                </div>

                {/* Arrow to Step 2 (Desktop) */}
                <div className="hidden md:flex absolute -right-6 top-36 -translate-y-1/2 z-20 text-[#E65A15]">
                  <Icons.ArrowRight size={22} strokeWidth={2.5} />
                </div>
              </div>

              {/* Step 02 */}
              <div className="relative flex flex-col items-center group">
                <div className="relative w-full max-w-[280px]">
                  {/* Step Top Pill Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EADECF] shadow-sm rounded-full px-3.5 py-0.5">
                    <span className="w-4 h-4 rounded-full bg-[#E65A15] text-white text-[10px] font-bold flex items-center justify-center">02</span>
                    <span className="text-[11px] font-bold text-[#2D1807] uppercase tracking-wider">Selfie</span>
                  </div>

                  {/* Card Container */}
                  <Card variant="clay" className="p-3.5 pt-4 group-hover:shadow-[0_16px_36px_rgba(230,90,21,0.12)] transition-shadow">
                    <div className="rounded-2xl overflow-hidden aspect-square bg-[#FAF6F0] relative">
                      <Image
                        src="/images/landing/step-selfie.webp"
                        alt="Take a quick selfie"
                        width={280}
                        height={280}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Card>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[240px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Take a quick selfie
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1.5 leading-snug font-medium">
                    A private 2-second scan creates your personal visual search key. Never stored.
                  </p>
                </div>

                {/* Arrow to Step 3 (Desktop) */}
                <div className="hidden md:flex absolute -right-6 top-36 -translate-y-1/2 z-20 text-[#E65A15]">
                  <Icons.ArrowRight size={22} strokeWidth={2.5} />
                </div>
              </div>

              {/* Step 03 */}
              <div className="relative flex flex-col items-center group">
                <div className="relative w-full max-w-[280px]">
                  {/* Step Top Pill Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EADECF] shadow-sm rounded-full px-3.5 py-0.5">
                    <span className="w-4 h-4 rounded-full bg-[#E65A15] text-white text-[10px] font-bold flex items-center justify-center">03</span>
                    <span className="text-[11px] font-bold text-[#2D1807] uppercase tracking-wider">Find</span>
                  </div>

                  {/* Card Container */}
                  <Card variant="clay" className="p-3.5 pt-4 group-hover:shadow-[0_16px_36px_rgba(230,90,21,0.12)] transition-shadow">
                    <div className="rounded-2xl overflow-hidden aspect-square bg-[#FAF6F0] relative">
                      <Image
                        src="/images/landing/step-find.webp"
                        alt="Get your photos"
                        width={280}
                        height={280}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </Card>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[240px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Get your photos
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1.5 leading-snug font-medium">
                    Instantly view and download full-resolution pictures of you and your friends with one tap.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6. THE EXPERIENCE ("A better way to relive your events")                 */}
        {/* ========================================================================= */}
        <section id="the-moments" className="py-16 sm:py-24 relative bg-[#FAF6F0] border-t border-[#F0E6D8]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
              
              {/* Left Column: Portrait */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-[360px] lg:max-w-none">
                  <div className="rounded-[2.5rem] overflow-hidden border border-[#EADECF] shadow-[0_20px_45px_rgba(110,65,30,0.1)] aspect-[4/5] bg-[#FAF6F0] relative">
                    <Image
                      src="/images/landing/event-memory.webp"
                      alt="Smiling guest in festive wedding attire"
                      width={480}
                      height={600}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Title and 3 Feature Items */}
              <div className="lg:col-span-7 relative">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-serif font-black text-[#2D1807] leading-[1.18] tracking-tight">
                  A better way to relive<br />your special moments
                </h2>

                <div className="mt-8 space-y-5 sm:space-y-6">
                  {/* Feature 1 */}
                  <div className="flex items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-white/70 border border-[#EADECF]/80 transition-all hover:bg-white hover:shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EDE1] border border-[#E8DEC8] flex items-center justify-center text-[#E65A15] shrink-0 shadow-sm">
                      <Icons.Image size={21} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                        Photos that matter to you
                      </h3>
                      <p className="text-[#5C4D43] text-sm leading-relaxed mt-0.5 font-medium">
                        Instead of scrolling through hundreds of strangers, jump straight to the captures where your smile shines.
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-white/70 border border-[#EADECF]/80 transition-all hover:bg-white hover:shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EDE1] border border-[#E8DEC8] flex items-center justify-center text-[#E65A15] shrink-0 shadow-sm">
                      <Icons.Users size={21} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                        Engineered for any occasion
                      </h3>
                      <p className="text-[#5C4D43] text-sm leading-relaxed mt-0.5 font-medium">
                        Weddings, engagements, conferences, corporate galas, and festival celebrations.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-start gap-4 sm:gap-5 p-4 sm:p-5 rounded-2xl bg-white/70 border border-[#EADECF]/80 transition-all hover:bg-white hover:shadow-sm">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EDE1] border border-[#E8DEC8] flex items-center justify-center text-[#E65A15] shrink-0 shadow-sm">
                      <Icons.Lock size={21} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                        Private and ephemeral
                      </h3>
                      <p className="text-[#5C4D43] text-sm leading-relaxed mt-0.5 font-medium">
                        Your face scan is processed client-side and never saved or stored as permanent biometric files.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Decorative flower branch */}
                <div className="hidden lg:block absolute -right-6 -bottom-8 w-20 pointer-events-none select-none">
                  <Image
                    src="/images/landing-v2/flower_branch.webp"
                    alt=""
                    width={80}
                    height={80}
                    loading="lazy"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 7. SOCIAL PROOF & TESTIMONIALS                                            */}
        {/* ========================================================================= */}
        <section className="py-16 sm:py-24 bg-white/70 border-t border-[#F0E6D8]/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="glow" size="default" dot className="mb-3 uppercase tracking-wider">
                <Icons.Star size={13} />
                <span>Verified Social Proof</span>
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-serif font-black text-[#2D1807] tracking-tight">
                Trusted by Top Wedding & Event Creators
              </h2>
              <p className="mt-3 text-[#5C4D43] text-sm sm:text-base max-w-xl mx-auto font-medium">
                Over 50,000 photos delivered across elite weddings, festivals, and summits with zero guest friction.
              </p>
            </div>

            {/* Testimonials Grid */}
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              
              {/* Review 1 */}
              <Card variant="clay" className="p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Icons.Star key={i} size={15} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <p className="text-sm text-[#2D1807] leading-relaxed italic font-medium">
                    &ldquo;Chobi Dao eliminated 3 weeks of endless WhatsApp messages asking &apos;Where are my photos?&apos;. Guests found their pictures during dinner while the wedding reception was still happening. It&apos;s pure magic.&rdquo;
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#EADECF] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#2D1807]">Tanvir Ahmed</h4>
                    <p className="text-xs text-[#7A6B62]">Lead Photographer, Dhaka Wedding Stories</p>
                  </div>
                  <Badge variant="outline" size="sm">48k photos</Badge>
                </div>
              </Card>

              {/* Review 2 */}
              <Card variant="clay" className="p-6 sm:p-7 flex flex-col justify-between border-orange-500/30">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Icons.Star key={i} size={15} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <p className="text-sm text-[#2D1807] leading-relaxed italic font-medium">
                    &ldquo;We had 1,400 attendees at our annual corporate summit. Within 20 minutes of keynotes ending, over 800 executives had downloaded their stage portraits directly to LinkedIn. The speed is unbelievable.&rdquo;
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#EADECF] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#2D1807]">Farhana Rahman</h4>
                    <p className="text-xs text-[#7A6B62]">Events Director, TechSummit Asia</p>
                  </div>
                  <Badge variant="outline" size="sm">1,400 guests</Badge>
                </div>
              </Card>

              {/* Review 3 */}
              <Card variant="clay" className="p-6 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-500 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Icons.Star key={i} size={15} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                  <p className="text-sm text-[#2D1807] leading-relaxed italic font-medium">
                    &ldquo;The strict privacy guarantee is what won over our celebrity and luxury wedding clients. No permanent biometric database, just client-side matching. The design is gorgeous and super intuitive.&rdquo;
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#EADECF] flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#2D1807]">Rahul Sen</h4>
                    <p className="text-xs text-[#7A6B62]">Creative Director, Lumina Arts</p>
                  </div>
                  <Badge variant="outline" size="sm">35 weddings</Badge>
                </div>
              </Card>

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 8. PRICING / PHOTOGRAPHER TIER PREVIEW                                    */}
        {/* ========================================================================= */}
        <section id="pricing" className="py-16 sm:py-24 relative bg-[#FAF6F0] border-t border-[#F0E6D8]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="glow" size="default" dot className="mb-3 uppercase tracking-wider">
                <Icons.Zap size={13} />
                <span>Photographer & Studio Tiers</span>
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-serif font-black text-[#2D1807] tracking-tight">
                Simple, Transparent Event Pricing
              </h2>
              <p className="mt-3 text-[#5C4D43] text-sm sm:text-base max-w-xl mx-auto font-medium">
                Try Chobi Dao free on your next intimate shoot, or upgrade to unlimited pro galleries for busy wedding seasons.
              </p>

              {/* Billing Toggle (Per Event vs Unlimited Pro) */}
              <div className="mt-8 inline-flex items-center p-1.5 rounded-2xl bg-white border border-[#EADECF] shadow-sm">
                <button
                  onClick={() => setBillingCycle("event")}
                  className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    billingCycle === "event"
                      ? "bg-[#2D1807] text-white shadow-sm"
                      : "text-[#5C4D43] hover:text-[#2D1807]"
                  }`}
                >
                  Pay Per Event
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                    billingCycle === "annual"
                      ? "bg-[#E65A15] text-white shadow-sm"
                      : "text-[#5C4D43] hover:text-[#2D1807]"
                  }`}
                >
                  <span>Unlimited Pro</span>
                  <span className="text-[10px] bg-amber-400 text-[#2D1807] px-1.5 py-0.5 rounded-full font-black uppercase">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>

            {/* 3 Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto">
              
              {/* 1. Starter Tier */}
              <Card variant="default" className="flex flex-col justify-between border-[#EADECF]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A6B62]">
                      Starter
                    </span>
                    <Badge variant="outline" size="sm">Free Forever</Badge>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-serif font-black text-4xl text-[#2D1807]">$0</span>
                    <span className="text-xs text-[#7A6B62] font-semibold">/ event</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-2 font-medium">
                    Perfect for trying Chobi Dao on an intimate birthday or family shoot.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-[#2D1807] font-semibold">
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>1 Active Event</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Up to 300 High-Res Photos</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>7-Day Guest Gallery Access</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Instant Printable QR PDF</span>
                    </li>
                    <li className="flex items-center gap-2.5 text-[#8A7B72]">
                      <Icons.Check size={16} className="text-neutral-400 shrink-0" />
                      <span>Standard Client Face Search</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-[#EADECF]">
                  <Link href="/auth">
                    <Button variant="outline" size="default" className="w-full font-bold">
                      Get Started Free
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* 2. Pro Photographer Tier (Highlight) */}
              <Card variant="highlight" className="flex flex-col justify-between relative transform lg:-translate-y-2">
                {/* Popular Pill */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge variant="default" size="default" className="uppercase font-black text-[10px] tracking-widest px-4 py-1">
                    ★ PHOTOGRAPHER&apos;S CHOICE
                  </Badge>
                </div>

                <div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#E65A15]">
                      Pro Photographer
                    </span>
                    <Badge variant="glow" size="sm">Most Popular</Badge>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-serif font-black text-4xl text-[#2D1807]">
                      {billingCycle === "event" ? "$29" : "$39"}
                    </span>
                    <span className="text-xs text-[#7A6B62] font-semibold">
                      {billingCycle === "event" ? "/ event" : "/ month"}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-2 font-medium">
                    Engineered for wedding professionals and studios delivering luxury client experiences.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-[#2D1807] font-semibold">
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>{billingCycle === "event" ? "1 Event (All Features)" : "Unlimited Events"}</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Up to 10,000 Photos per Event</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>90-Day Ultra-Fast CDN Hosting</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>0.38s Instant Vector Search</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Custom Watermark & Studio Branding</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Live Guest Analytics & ZIP Exports</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-[#EADECF]">
                  <Link href="/auth">
                    <Button variant="gradient" size="default" className="w-full shadow-clay-btn font-bold">
                      Start 14-Day Free Trial
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* 3. Studio Enterprise Tier */}
              <Card variant="default" className="flex flex-col justify-between border-[#EADECF]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A6B62]">
                      Studio Enterprise
                    </span>
                    <Badge variant="secondary" size="sm">Team Suite</Badge>
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-serif font-black text-4xl text-[#2D1807]">$119</span>
                    <span className="text-xs text-[#7A6B62] font-semibold">/ month</span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-2 font-medium">
                    For multi-crew media houses, festival producers, and corporate summits.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm text-[#2D1807] font-semibold">
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Multi-Photographer Team Seats (10+)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Unlimited Photos & RAW Vault Storage</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Custom Subdomain (photos.yourstudio.com)</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>Dedicated GPU Indexing Priority</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Icons.CheckCircle size={16} className="text-[#E65A15] shrink-0" />
                      <span>White-Glove VIP Support & Concierge</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-[#EADECF]">
                  <Link href="/auth">
                    <Button variant="default" size="default" className="w-full font-bold">
                      Contact Studio Team
                    </Button>
                  </Link>
                </div>
              </Card>

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 9. INTERACTIVE FAQ ACCORDION SECTION                                      */}
        {/* ========================================================================= */}
        <section id="faq" className="py-16 sm:py-24 bg-white/70 border-t border-[#F0E6D8]/80">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="text-center mb-12 sm:mb-16">
              <Badge variant="glow" size="default" dot className="mb-3 uppercase tracking-wider">
                <Icons.Info size={13} />
                <span>Frequently Asked Questions</span>
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-[2.5rem] font-serif font-black text-[#2D1807] tracking-tight">
                Everything You Need to Know
              </h2>
              <p className="mt-3 text-[#5C4D43] text-sm sm:text-base max-w-lg mx-auto font-medium">
                Clear answers regarding guest privacy, indexing speed, RAW support, and setup ease.
              </p>

              {/* Category Filter Tabs */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {[
                  { key: "all", label: "All Questions" },
                  { key: "guests", label: "Guests & Privacy" },
                  { key: "photographers", label: "Photographers" },
                  { key: "tech", label: "Technology" }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFaqCategory(tab.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      activeFaqCategory === tab.key
                        ? "bg-[#2D1807] text-[#FAF6F0]"
                        : "bg-[#FAF6F0] text-[#5C4D43] border border-[#EADECF] hover:bg-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Accordion List */}
            <div className="space-y-4">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="border border-[#EADECF] rounded-2xl bg-[#FAF6F0] overflow-hidden transition-all duration-200"
                  >
                    <button
                      onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                      className="w-full px-5 sm:px-6 py-4.5 text-left flex items-center justify-between gap-4 font-serif font-bold text-base sm:text-lg text-[#2D1807] hover:text-[#E65A15] transition-colors"
                      aria-expanded={isOpen}
                    >
                      <span>{faq.question}</span>
                      <div
                        className={`w-7 h-7 rounded-full bg-white border border-[#EADECF] flex items-center justify-center text-[#E65A15] transition-transform duration-200 shrink-0 ${
                          isOpen ? "rotate-180 bg-[#E65A15] text-white" : ""
                        }`}
                      >
                        <Icons.ChevronDown size={16} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 sm:px-6 pb-5 pt-1 text-xs sm:text-sm text-[#5C4D43] leading-relaxed font-medium border-t border-[#F0E6D8]/60">
                            {faq.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* 10. PHOTOGRAPHER CALL TO ACTION BANNER                                    */}
        {/* ========================================================================= */}
        <section id="photographers" className="py-14 sm:py-20 bg-[#FAF6F0] border-t border-[#F0E6D8]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-gradient-to-r from-[#D85213] via-[#E65A15] to-[#EE6B26] p-7 sm:p-12 text-white shadow-2xl shadow-orange-950/15 overflow-hidden">
              
              {/* Subtle background ambient pattern */}
              <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
                {/* Left side: Icon + Headings */}
                <div className="flex items-start sm:items-center gap-5 sm:gap-6">
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center text-white shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner">
                      <Icons.Camera size={30} strokeWidth={2} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black text-white tracking-tight">
                      Are you a photographer?
                    </h3>
                    <p className="text-orange-100/90 text-sm sm:text-base mt-1.5 max-w-xl font-medium">
                      Deliver an unforgettable experience to your event hosts and guests with instant QR photo distribution.
                    </p>
                  </div>
                </div>

                {/* Right side: Button */}
                <Link href="/auth">
                  <Button
                    variant="clay"
                    size="lg"
                    className="gap-2.5 text-xs sm:text-sm font-black whitespace-nowrap bg-white text-[#2D1807]"
                  >
                    <Icons.Camera size={18} strokeWidth={2.2} />
                    <span>Set up my event</span>
                  </Button>
                </Link>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* 11. FOOTER                                                                */}
      {/* ========================================================================= */}
      <footer className="pt-14 pb-12 relative border-t border-[#F0E6D8] bg-[#F7F2EB] text-[#2D1807]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-[#EADECF]/80">
            {/* Column 1: Brand Info */}
            <div className="md:col-span-2 flex flex-col items-start pr-0 md:pr-12">
              <Link href="/" className="flex items-center gap-2.5 group mb-3">
                <div className="w-9 h-9 rounded-xl border border-[#E65A15] flex items-center justify-center text-[#E65A15] bg-[#FAF6F0] shadow-sm">
                  <Icons.Camera size={19} strokeWidth={2.2} />
                </div>
                <span className="font-serif font-bold text-2xl text-[#2D1807] tracking-tight">Chobi Dao</span>
              </Link>
              <p className="text-sm text-[#5C4D43] leading-relaxed max-w-sm font-medium">
                AI-powered event photo retrieval. Scan your event QR code, take a quick selfie, and retrieve every memory where you appear.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#7A6B62] font-semibold">
                <Badge variant="outline" size="sm">Fast & Private</Badge>
                <Badge variant="outline" size="sm">No App Needed</Badge>
                <Badge variant="outline" size="sm">MediaPipe 3D</Badge>
              </div>
            </div>

            {/* Column 2: Navigation Links */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#7A6B62] mb-4">Platform</h4>
              <ul className="space-y-2.5 text-sm font-medium">
                <li>
                  <Link href="/find" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    Find Event Photos
                  </Link>
                </li>
                <li>
                  <a href="#live-demo" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    Live Demo Simulator
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    Pricing Tiers
                  </a>
                </li>
                <li>
                  <Link href="/auth" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    Photographer Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Legal & Privacy */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-[#7A6B62] mb-4">Privacy & Security</h4>
              <ul className="space-y-2.5 text-sm font-medium">
                <li>
                  <Link href="/privacy" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link href="/cookies" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    Cookie Policy
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    Security & Biometrics FAQ
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A6B62] font-medium">
            <p>© {new Date().getFullYear()} Chobi Dao. All rights reserved.</p>
            <p className="flex items-center gap-1">
              <span>Engineered with care for celebration moments</span>
            </p>
          </div>
        </div>

        {/* Botanical leaf flourish in bottom right corner */}
        <div className="absolute right-0 bottom-0 w-24 sm:w-32 pointer-events-none select-none opacity-80">
          <Image
            src="/images/landing-v2/botanical_corner.webp"
            alt=""
            width={128}
            height={128}
            loading="lazy"
            className="w-full h-auto object-contain"
          />
        </div>
      </footer>
    </div>
  );
}
