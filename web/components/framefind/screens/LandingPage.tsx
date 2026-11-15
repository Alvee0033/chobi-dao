"use client";

import { useState } from "react";
import { Icons } from "../icons";
import { ClayButton } from "../ui/ClayButton";
import { useRouter } from "next/navigation";
import { MasterpieceHero } from "../ui/MasterpieceHero";

export function LandingPage() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const openGuestStart = () => router.push("/find");
  const openAuth = () => router.push("/auth");
  const openSupport = () => {
    window.location.href = "mailto:support@chobidao.com?subject=Chobi%20dao%20support";
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] selection:bg-orange-100 selection:text-orange-900 font-sans text-charcoal overflow-x-hidden">
      {/* 
        STEP 1: PREMIUM COMPACT NAVIGATION
        We use a high-z-index floating navbar with extreme backdrop-blur (3xl) 
        and a 'shadow-clay-card' to create the illusion of a soft, floating pill.
      */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2.5rem)] max-w-5xl">
        {/* Floating Bar Container */}
        <div className="h-14 flex justify-between items-center px-6 backdrop-blur-3xl bg-gradient-to-r from-orange-50/90 via-orange-100/60 to-orange-50/90 border border-orange-200/50 shadow-clay-card rounded-full transition-all duration-500 hover:shadow-clay-puffy">
          {/* Logo */}
          <div className="flex items-center gap-3 font-black text-xl tracking-tighter cursor-pointer group" onClick={() => { setIsMenuOpen(false); window.scrollTo({top: 0, behavior: 'smooth'}); }}>
            <div className="w-12 h-12 relative flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
              <img src="/logo.png" alt="Chobi Dao Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          
          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Process', 'Pricing'].map((link) => (
              <button 
                key={link} 
                onClick={() => document.getElementById(link.toLowerCase())?.scrollIntoView({ behavior: 'smooth' })}
                className="text-[10px] font-black uppercase tracking-[0.2em] text-charcoal/50 hover:text-orange-600 transition-colors"
              >
                {link}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <button 
              onClick={openAuth} 
              className="h-7 sm:h-8 px-3 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-charcoal/80 bg-white/90 border border-white/60 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,1),inset_0_-1px_2px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 whitespace-nowrap"
            >
              Pro Login
            </button>

            {/* Mobile Menu Hamburger Toggle */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white border border-charcoal/5 shadow-clay-card hover:bg-orange-100 text-charcoal/70 transition-all active:scale-95"
              aria-label="Toggle Menu"
            >
              {isMenuOpen ? <Icons.X size={16} /> : <Icons.Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMenuOpen && (
          <div className="absolute top-16 left-0 right-0 p-6 bg-gradient-to-b from-orange-50/95 via-[#FAF9F6]/95 to-orange-100/90 backdrop-blur-3xl border border-orange-200/50 shadow-clay-puffy rounded-[32px] md:hidden flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {['Features', 'Process', 'Pricing'].map((link) => (
              <button 
                key={link} 
                onClick={() => {
                  setIsMenuOpen(false);
                  document.getElementById(link.toLowerCase())?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full text-left py-3 px-5 text-xs font-black uppercase tracking-[0.2em] text-charcoal/60 hover:text-orange-500 hover:bg-orange-50/50 rounded-2xl transition-all"
              >
                {link}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* 
        STEP 2: SIDE-BY-SIDE COMPACT HERO (ATF Focused)
        We use a height-optimized container (min-h-[85vh]) to ensure the visual 
        and text are visible simultaneously without scrolling.
      */}
      <main className="relative pt-24 pb-12 lg:pt-36 lg:pb-20 max-w-7xl mx-auto px-6 min-h-[calc(100vh-80px)] flex items-center">
        <div className="w-full flex flex-col-reverse lg:flex-row items-center justify-between gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: THE CORE PROPOSITION */}
          <div className="flex-1 max-w-2xl text-center lg:text-left z-10">

            <h1 className="text-5xl sm:text-6xl md:text-7xl xl:text-8xl font-black leading-[0.95] tracking-tight text-charcoal mb-6 sm:mb-8">
              Find your <br />
              <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-orange-600 bg-clip-text text-transparent relative inline-block pb-2 animate-pulse-slow">
                moments
              </span>
              <br />instantly.
            </h1>

            <p className="text-base sm:text-lg md:text-xl font-bold text-muted max-w-lg mb-10 leading-relaxed mx-auto lg:mx-0">
              The premium AI gallery for events. Take a selfie, skip the search, and get your photos delivered in seconds.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 px-2 sm:px-0">
              <ClayButton 
                onClick={openGuestStart} 
                className="h-16 sm:h-[76px] px-10 sm:px-14 text-base sm:text-xl !rounded-[24px] sm:!rounded-[32px] shadow-clay-btn group relative overflow-hidden whitespace-nowrap bg-orange-500 hover:bg-orange-600 text-white transition-all duration-300 transform active:scale-95"
              >
                <span className="relative z-10 flex items-center justify-center gap-4">
                  <Icons.FaceId size={30} className="group-hover:rotate-12 transition-transform duration-300" /> 
                  Find My Photos Now
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-0" />
              </ClayButton>
              
              <button 
                onClick={openAuth}
                className="h-16 sm:h-[76px] px-10 sm:px-12 rounded-[24px] sm:rounded-[32px] bg-white border-2 border-charcoal/10 text-charcoal font-black text-sm sm:text-base hover:border-orange-500/50 hover:bg-orange-50/10 shadow-[0_4px_14px_rgba(0,0,0,0.03)] hover:shadow-clay-card transition-all duration-300 active:scale-95 flex items-center justify-center gap-3 group"
              >
                Photographer Portal
                <Icons.ChevronRight size={22} className="text-orange-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Premium Feature Trust Indicators */}
            <div className="mt-12 pt-8 border-t border-charcoal/5 flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4 text-[11px] text-charcoal/60 font-black tracking-wider uppercase">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-inner">
                  <Icons.Zap size={15} />
                </div>
                <span>0.2s Search Time</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-inner">
                  <Icons.Lock size={15} />
                </div>
                <span>Private & Secure</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-inner">
                  <Icons.FaceId size={15} />
                </div>
                <span>99.9% AI Accuracy</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SCULPTED MASTERPIECE */}
          <div className="flex-1 w-full max-w-sm sm:max-w-md lg:max-w-xl mx-auto">
             <MasterpieceHero />
          </div>
        </div>
      </main>

      {/* FEATURES SECTION: THE VALUE PROP */}
      <section id="features" className="py-24 px-6 bg-[#FAF9F6] relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <Icons.Zap size={18} />, 
              title: "Instant Indexing", 
              desc: "Our AI processes thousands of photos in real-time, making them searchable immediately.",
              image: "/images/landing/indexing_clay.png",
              badge: "AI Classification"
            },
            { 
              icon: <Icons.FaceId size={18} />, 
              title: "Face Recognition", 
              desc: "Take a selfie and find every photo of yourself across the entire event gallery.",
              image: "/images/landing/face_clay.png",
              badge: "AI Face Scan"
            },
            { 
              icon: <Icons.Lock size={18} />, 
              title: "Secure Delivery", 
              desc: "Private, encrypted galleries ensure your memories are seen only by you.",
              image: "/images/landing/secure_clay.png",
              badge: "Security & Encryption"
            }
          ].map((feat, i) => (
            <div key={i} className="bg-white border border-charcoal/5 rounded-[40px] shadow-clay-card hover:shadow-clay-puffy transition-all duration-500 hover:-translate-y-2 group overflow-hidden flex flex-col">
              {/* Card visual representation inside a premium inner-frame */}
              <div className="p-4 pb-0">
                <div className="relative aspect-[4/3] rounded-[28px] overflow-hidden bg-orange-50/30 border border-charcoal/5 shadow-inner">
                  <img 
                    src={feat.image} 
                    alt={feat.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Subtle glass badge */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/50 shadow-clay-card flex items-center gap-2">
                    <span className="text-orange-500 flex items-center">{feat.icon}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-charcoal/80">{feat.badge}</span>
                  </div>
                </div>
              </div>
              
              {/* Card textual info */}
              <div className="p-8 flex flex-col flex-1">
                <h3 className="text-2xl font-black text-charcoal mb-3 group-hover:text-orange-500 transition-colors">{feat.title}</h3>
                <p className="text-sm font-medium text-charcoal/55 leading-relaxed">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STEPS SECTION: HOW IT WORKS */}
      <section id="process" className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <div className="inline-block px-4 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-full text-orange-500 text-[10px] font-black tracking-[0.2em] uppercase mb-6">
              Process
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-charcoal tracking-tight">Your Photos, <br /><span className="text-orange-500">3 Easy Steps</span></h2>
          </div>
          
          <div className="space-y-32">
            {[
              { 
                step: "01", 
                title: "Scan Event QR", 
                desc: "Find the unique Chobi Dao QR code at your event. Simply scan it with your phone camera to instantly access the private gallery portal.",
                image: "/assets/step1.png"
              },
              { 
                step: "02", 
                title: "Take a Selfie", 
                desc: "Snap a quick selfie. Our advanced AI instantly indexes thousands of event photos and finds every single one where you appear in milliseconds.",
                image: "/assets/step2.png"
              },
              { 
                step: "03", 
                title: "Get Your Pack", 
                desc: "Browse through your personal matches and download the full-resolution HD photos directly to your gallery. Fast, secure, and instant.",
                image: "/assets/step3.png"
              }
            ].map((item, i) => (
              <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-24 group`}>
                <div className="flex-1 w-full">
                  <div className="relative aspect-[4/3] rounded-[48px] overflow-hidden shadow-clay-puffy bg-orange-50/50 group-hover:-translate-y-2 transition-all duration-700">
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal/20 to-transparent" />
                  </div>
                </div>
                
                <div className="flex-1 text-center lg:text-left space-y-6">
                  <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center text-2xl font-black text-white shadow-[0_10px_20px_rgba(249,115,22,0.3)] mx-auto lg:mx-0 group-hover:rotate-6 transition-transform">
                    {item.step}
                  </div>
                  <h3 className="text-3xl sm:text-4xl font-black text-charcoal">{item.title}</h3>
                  <p className="text-lg text-charcoal/50 leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPACT PRO SUITE BANNER */}
      <section id="pricing" className="py-16 px-6 bg-charcoal text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
              Chobi Dao <span className="text-orange-500 italic">Pro</span>
              <div className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/30 rounded text-[9px] uppercase tracking-widest text-orange-500">Waitlist</div>
            </h2>
            <p className="text-sm text-white/40 font-medium max-w-md">
              AI-powered delivery, dynamic watermarks, and 4K downloads for pro photographers.
            </p>
          </div>
          <button 
            onClick={openAuth}
            className="h-11 px-8 rounded-full bg-orange-500 text-white font-black uppercase tracking-widest text-xs shadow-[0_4px_12px_rgba(249,115,22,0.2)] hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
          >
            Join Pro Waitlist
          </button>
        </div>
      </section>

      {/* MINIMAL FOOTER */}
      <footer className="w-full px-6 md:px-10 lg:px-14 pb-10 pt-14 border-t border-charcoal/5 bg-gradient-to-b from-[#FAF9F6] to-[#F6F4EE]">
        <div className="w-full border border-charcoal/5 bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(39,39,42,0.06)] px-6 py-6 md:px-8 md:py-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center shadow-clay-card">
                  <img src="/logo.png" alt="Chobi Dao" className="w-6 h-6 object-contain" />
                </div>
                <div>
                  <p className="text-sm font-black text-charcoal tracking-tight">Chobi dao</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-charcoal/35">AI Event Gallery</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start md:justify-center gap-3 text-[11px] font-bold text-charcoal/50">
                <a href="/privacy" className="px-3 py-1.5 rounded-full bg-orange-50/60 border border-orange-100 hover:text-orange-600 hover:bg-orange-100/70 transition-colors">Privacy Policy</a>
                <a href="/terms" className="px-3 py-1.5 rounded-full bg-orange-50/60 border border-orange-100 hover:text-orange-600 hover:bg-orange-100/70 transition-colors">Terms</a>
                <a href="/cookies" className="px-3 py-1.5 rounded-full bg-orange-50/60 border border-orange-100 hover:text-orange-600 hover:bg-orange-100/70 transition-colors">Cookies</a>
              </div>

              <div className="flex items-center gap-2">
                {[<Icons.Instagram size={14}/>, <Icons.Twitter size={14}/>].map((icon, i) => (
                  <a key={i} href="#" className="w-9 h-9 rounded-full flex items-center justify-center bg-white border border-charcoal/10 text-charcoal/35 hover:text-orange-500 hover:border-orange-200 transition-all">
                    {icon}
                  </a>
                ))}
              </div>
            </div>

          <div className="mt-5 pt-4 border-t border-charcoal/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-charcoal/35">
              All rights reserved © 2026{" "}
              <a
                href="https://jantrasoft.online"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-orange-300 underline-offset-2 hover:text-orange-600 transition-colors"
              >
                jantrasoft.online
              </a>
            </p>
            <p className="text-[10px] font-bold text-charcoal/30">Built for photographers and event teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
