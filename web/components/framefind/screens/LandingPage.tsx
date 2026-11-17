import Image from "next/image";
import Link from "next/link";
import { Icons } from "../icons";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2D1807] font-sans selection:bg-[#E65A15] selection:text-white relative overflow-x-hidden flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#FAF6F0]/90 backdrop-blur-md border-b border-[#F0E6D8]/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-[#E65A15]/40 flex items-center justify-center text-[#E65A15] bg-[#FAF6F0] shadow-sm group-hover:scale-105 transition-transform">
              <Icons.Camera size={20} strokeWidth={2.2} />
            </div>
            <span className="font-serif font-bold text-xl sm:text-2xl text-[#2D1807] tracking-tight">Chobi Dao</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-[#5C4D43] hover:text-[#E65A15] font-semibold text-sm tracking-wide transition-colors"
            >
              How it works
            </a>
            <a
              href="#the-moments"
              className="text-[#5C4D43] hover:text-[#E65A15] font-semibold text-sm tracking-wide transition-colors"
            >
              Experience
            </a>
            <a
              href="#photographers"
              className="text-[#5C4D43] hover:text-[#E65A15] font-semibold text-sm tracking-wide transition-colors"
            >
              For photographers
            </a>
          </nav>

          {/* Header Action Button */}
          <div className="flex items-center gap-2">
            <Link
              href="/find"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-clay-btn transition-all duration-200 hover:scale-[1.02] active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Icons.Image size={15} className="shrink-0" strokeWidth={2.2} />
              <span className="hidden sm:inline">Find my photos</span>
              <span className="sm:hidden">Find photos</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO SECTION — FULL SCREEN ON DESKTOP (min-h-[calc(100vh-5rem)]) */}
        <section className="relative min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] flex items-center justify-center overflow-hidden py-8 sm:py-12 lg:py-0">
          {/* Subtle warm ambient background lighting */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-200/30 rounded-full blur-[100px] pointer-events-none -z-10" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-200/25 rounded-full blur-[100px] pointer-events-none -z-10" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              
              {/* Image Column: Appears FIRST on mobile, Right on Desktop */}
              <div className="w-full lg:col-span-6 order-1 lg:order-2 flex justify-center items-center relative">
                <div className="relative w-full max-w-[380px] sm:max-w-[460px] lg:max-w-[540px]">
                  <div className="absolute -inset-4 bg-gradient-to-tr from-amber-300/25 via-orange-200/20 to-transparent rounded-[2.5rem] blur-2xl -z-10" />
                  
                  <Image
                    src="/images/landing/hero-match-flow.webp"
                    alt="Scan event QR code, take a selfie, and find all matching event photos"
                    width={540}
                    height={480}
                    priority
                    className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(110,65,30,0.14)] transform hover:scale-[1.01] transition-transform duration-300"
                  />
                </div>
              </div>

              {/* Text & Actions Column: Appears SECOND on mobile, Left on Desktop */}
              <div className="w-full lg:col-span-6 order-2 lg:order-1 relative z-10 text-center lg:text-left">
                {/* Instant Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[#E65A15] text-xs font-bold uppercase tracking-wider mb-4 sm:mb-6">
                  <Icons.Sparkles size={13} className="shrink-0" />
                  <span>Instant Face Discovery</span>
                </div>

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
                  Scan your event&apos;s QR code, take a 2-second selfie, and let our private AI instantly locate every high-res photo you appear in.
                </p>

                {/* Hero CTA Buttons */}
                <div className="mt-6 sm:mt-9 flex flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full">
                  <Link
                    href="/find"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm sm:text-base rounded-2xl shadow-clay-btn transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap text-center"
                  >
                    <Icons.Image size={18} className="shrink-0" strokeWidth={2.2} />
                    <span>Find photos</span>
                  </Link>
                  <Link
                    href="/auth"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3.5 sm:py-4 bg-white/95 hover:bg-white text-[#2D1807] font-bold text-sm sm:text-base rounded-2xl shadow-clay-card border border-[#EADECF] transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap text-center"
                  >
                    <Icons.Camera size={18} className="shrink-0" strokeWidth={2} />
                    <span>Photographers</span>
                  </Link>
                </div>

                {/* Quick Trust Signals */}
                <div className="mt-8 pt-6 border-t border-[#F0E6D8]/80 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs text-[#7A6B62] font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Icons.CheckCircle size={15} className="text-[#E65A15]" />
                    <span>Zero app install needed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icons.CheckCircle size={15} className="text-[#E65A15]" />
                    <span>Instant private matching</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Icons.CheckCircle size={15} className="text-[#E65A15]" />
                    <span>High-resolution downloads</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Desktop Scroll Indicator */}
          <a
            href="#how-it-works"
            className="hidden lg:flex absolute bottom-4 left-1/2 -translate-x-1/2 flex-col items-center gap-1 text-[#7A6B62] hover:text-[#E65A15] transition-colors group cursor-pointer"
            aria-label="Scroll to how it works"
          >
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#7A6B62]/80 group-hover:text-[#E65A15]">Scroll down</span>
            <div className="w-5 h-8 rounded-full border-2 border-[#EADECF] group-hover:border-[#E65A15] flex items-start justify-center p-1 transition-colors">
              <div className="w-1.5 h-2 bg-[#E65A15] rounded-full animate-bounce" />
            </div>
          </a>
        </section>

        {/* SECTION 2: HOW IT WORKS ("It's simple: Scan • Selfie • Find") */}
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
                No sifting through 2,000 photos. 3 steps and your memories are in your hands.
              </p>
            </div>

            {/* 3 Step Cards Grid */}
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
                  <div className="bg-[#FAF6F0] border border-[#EADECF] rounded-3xl p-3.5 pt-4 shadow-[0_12px_28px_rgba(110,65,30,0.06)] group-hover:shadow-[0_16px_36px_rgba(230,90,21,0.12)] transition-shadow">
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
                  </div>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[240px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Scan the event QR
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1.5 leading-snug font-medium">
                    Point your camera at the QR standee or card provided by the photographer.
                  </p>
                </div>

                {/* Arrow to Step 2 (Desktop) */}
                <div className="hidden md:flex absolute -right-6 top-36 -translate-y-1/2 z-20 text-[#E65A15]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
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
                  <div className="bg-[#FAF6F0] border border-[#EADECF] rounded-3xl p-3.5 pt-4 shadow-[0_12px_28px_rgba(110,65,30,0.06)] group-hover:shadow-[0_16px_36px_rgba(230,90,21,0.12)] transition-shadow">
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
                  </div>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[240px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Take a quick selfie
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1.5 leading-snug font-medium">
                    A private 2-second scan creates your personal visual search key.
                  </p>
                </div>

                {/* Arrow to Step 3 (Desktop) */}
                <div className="hidden md:flex absolute -right-6 top-36 -translate-y-1/2 z-20 text-[#E65A15]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
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
                  <div className="bg-[#FAF6F0] border border-[#EADECF] rounded-3xl p-3.5 pt-4 shadow-[0_12px_28px_rgba(110,65,30,0.06)] group-hover:shadow-[0_16px_36px_rgba(230,90,21,0.12)] transition-shadow">
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
                  </div>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[240px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Get your photos
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1.5 leading-snug font-medium">
                    Instantly view and download full-resolution pictures of you and your friends.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 3: THE EXPERIENCE ("A better way to relive your events") */}
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

                <div className="mt-8 space-y-6 sm:space-y-7">
                  {/* Feature 1 */}
                  <div className="flex items-start gap-4 sm:gap-5 p-4 rounded-2xl bg-white/50 border border-[#EADECF]/60 transition-all hover:bg-white/80">
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
                  <div className="flex items-start gap-4 sm:gap-5 p-4 rounded-2xl bg-white/50 border border-[#EADECF]/60 transition-all hover:bg-white/80">
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
                  <div className="flex items-start gap-4 sm:gap-5 p-4 rounded-2xl bg-white/50 border border-[#EADECF]/60 transition-all hover:bg-white/80">
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

        {/* SECTION 4: ARE YOU A PHOTOGRAPHER? BANNER */}
        <section id="photographers" className="py-14 sm:py-20 bg-[#FAF6F0] border-t border-[#F0E6D8]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-gradient-to-r from-[#D85213] via-[#E65A15] to-[#EE6B26] p-7 sm:p-12 text-white shadow-2xl shadow-orange-950/15 overflow-hidden">
              
              {/* Subtle background ambient pattern */}
              <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 relative z-10">
                {/* Left side: Icon + Radiating Rays + Headings */}
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
                      Deliver a magical experience to your event hosts and guests with instant QR photo distribution.
                    </p>
                  </div>
                </div>

                {/* Right side: Button */}
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2.5 px-8 py-4 bg-white hover:bg-orange-50 text-[#2D1807] font-black text-sm sm:text-base rounded-2xl shadow-clay-card border border-white/80 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap"
                >
                  <Icons.Camera size={20} strokeWidth={2.2} />
                  <span>Set up my event</span>
                </Link>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
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
              <div className="mt-4 flex items-center gap-3 text-xs text-[#7A6B62] font-semibold">
                <span className="px-2.5 py-1 rounded-full bg-white border border-[#EADECF]">Fast & Private</span>
                <span className="px-2.5 py-1 rounded-full bg-white border border-[#EADECF]">No App Needed</span>
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
                  <a href="#how-it-works" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#photographers" className="text-[#5C4D43] hover:text-[#E65A15] transition-colors">
                    For Photographers
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
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7A6B62] font-medium">
            <p>© {new Date().getFullYear()} Chobi Dao. All rights reserved.</p>
            <p className="flex items-center gap-1">
              <span>Made with care for celebration moments</span>
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
