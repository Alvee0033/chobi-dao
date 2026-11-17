import { Icons } from "../icons";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2D1807] font-sans selection:bg-[#E65A15] selection:text-white relative overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-[#FAF6F0]/90 backdrop-blur-md border-b border-[#F0E6D8]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl border border-[#E65A15] flex items-center justify-center text-[#E65A15] bg-[#FAF6F0] shadow-sm group-hover:scale-105 transition-transform">
              <Icons.Camera size={19} strokeWidth={2.2} />
            </div>
            <span className="font-serif font-bold text-2xl text-[#2D1807] tracking-tight">Chobi Dao</span>
          </a>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#how-it-works"
              className="text-[#2D1807] hover:text-[#E65A15] font-medium text-[15px] transition-colors"
            >
              How it works
            </a>
            <a
              href="#photographers"
              className="text-[#2D1807] hover:text-[#E65A15] font-medium text-[15px] transition-colors"
            >
              For photographers
            </a>
          </nav>

          {/* Header Action Button */}
          <div className="flex items-center gap-2">
            <a
              href="/find"
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-clay-btn transition-all duration-200 hover:scale-[1.02] active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Icons.Image size={15} className="shrink-0" strokeWidth={2.2} />
              <span className="hidden sm:inline">Find my photos</span>
              <span className="sm:hidden">Find photos</span>
            </a>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* HERO SECTION */}
        <section className="relative pt-4 sm:pt-6 pb-12 lg:pt-12 lg:pb-20 overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              
              {/* Image Column: Appears FIRST on mobile (order-1 lg:order-2), Right column on Desktop */}
              <div className="w-full lg:col-span-6 order-1 lg:order-2 relative">
                <div className="relative mx-auto max-w-[420px] sm:max-w-[480px] lg:max-w-none">
                  {/* Subtle warm ambient lighting */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-amber-200/35 via-orange-100/25 to-transparent rounded-3xl blur-3xl -z-10" />
                  
                  <img
                    src="/images/landing/hero-match-flow.png"
                    alt="Scan event QR code, take a selfie, and find all matching event photos"
                    className="w-full h-auto object-contain drop-shadow-[0_16px_36px_rgba(110,65,30,0.13)] transform hover:scale-[1.01] transition-transform duration-300"
                  />
                </div>
              </div>

              {/* Text & Actions Column: Appears SECOND on mobile (order-2 lg:order-1), Left column on Desktop */}
              <div className="w-full lg:col-span-6 order-2 lg:order-1 relative z-10 text-center lg:text-left mt-2 lg:mt-0">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-serif font-bold text-[#2D1807] leading-[1.14] tracking-tight">
                  Your event photos.<br />
                  Found by your{" "}
                  <span className="relative inline-block whitespace-nowrap">
                    face.
                    <svg
                      className="absolute -bottom-1.5 left-0 w-full overflow-visible"
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

                <p className="mt-4 sm:mt-6 text-[#5C4D43] text-sm sm:text-base lg:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Scan your event&apos;s QR code, take a selfie, and instantly find the photos you&apos;re in from the event gallery.
                </p>

                {/* Hero CTA Buttons - Side by Side on Mobile and Desktop */}
                <div className="mt-6 sm:mt-8 flex flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-4 w-full">
                  <a
                    href="/find"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-7 py-3 sm:py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs sm:text-base rounded-2xl shadow-clay-btn transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap text-center"
                  >
                    <Icons.Image size={17} className="sm:w-[19px] sm:h-[19px] shrink-0" strokeWidth={2.2} />
                    <span>Find photos</span>
                  </a>
                  <a
                    href="/auth"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2.5 px-3.5 sm:px-7 py-3 sm:py-3.5 bg-white/90 hover:bg-white text-[#2D1807] font-bold text-xs sm:text-base rounded-2xl shadow-clay-card border border-[#EADECF]/80 transition-all duration-200 hover:scale-105 active:scale-95 whitespace-nowrap text-center"
                  >
                    <Icons.Camera size={17} className="sm:w-[19px] sm:h-[19px] shrink-0" strokeWidth={2} />
                    <span>Photographers</span>
                  </a>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 2: HOW IT WORKS ("It's simple: Scan • Selfie • Find") */}
        <section id="how-it-works" className="py-14 sm:py-20 relative bg-[#FAF6F0]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            
            {/* Centered Heading */}
            <div className="text-center mb-14 sm:mb-16">
              <div className="inline-flex items-center justify-center gap-3">
                <span className="text-[#E65A15] text-2xl font-serif select-none">~</span>
                <h2 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-serif font-bold text-[#2D1807] tracking-tight">
                  It&apos;s simple: Scan • Selfie • Find
                </h2>
                <span className="text-[#E65A15] text-2xl font-serif select-none">~</span>
              </div>
            </div>

            {/* 3 Step Cards Grid using Native High-Res PNGs */}
            <div className="grid md:grid-cols-3 gap-8 lg:gap-10 items-start relative max-w-4xl mx-auto">
              
              {/* Step 01 */}
              <div className="relative flex flex-col items-center">
                <div className="relative w-full max-w-[270px]">
                  {/* Step Top Pill Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EADECF] shadow-sm rounded-full px-3 py-0.5">
                    <span className="w-4 h-4 rounded-full bg-[#E65A15] text-white text-[10px] font-bold flex items-center justify-center">01</span>
                    <span className="text-[11px] font-semibold text-[#2D1807]">Scan</span>
                  </div>

                  {/* Card Container with Native High-Res PNG */}
                  <div className="bg-[#FAF6F0] border border-[#EADECF] rounded-3xl p-3 pt-4 shadow-[0_12px_28px_rgba(110,65,30,0.07)]">
                    <div className="rounded-2xl overflow-hidden aspect-square bg-[#FAF6F0]">
                      <img
                        src="/images/landing/step-scan.png"
                        alt="Scan the event QR"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[220px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Scan the event QR
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1 leading-snug">
                    Use your phone to scan the QR code at the event.
                  </p>
                </div>

                {/* Arrow to Step 2 (Desktop) */}
                <div className="hidden md:flex absolute -right-6 top-32 -translate-y-1/2 z-20 text-[#E65A15]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>

              {/* Step 02 */}
              <div className="relative flex flex-col items-center">
                <div className="relative w-full max-w-[270px]">
                  {/* Step Top Pill Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EADECF] shadow-sm rounded-full px-3 py-0.5">
                    <span className="w-4 h-4 rounded-full bg-[#E65A15] text-white text-[10px] font-bold flex items-center justify-center">02</span>
                    <span className="text-[11px] font-semibold text-[#2D1807]">Selfie</span>
                  </div>

                  {/* Card Container with Native High-Res PNG */}
                  <div className="bg-[#FAF6F0] border border-[#EADECF] rounded-3xl p-3 pt-4 shadow-[0_12px_28px_rgba(110,65,30,0.07)]">
                    <div className="rounded-2xl overflow-hidden aspect-square bg-[#FAF6F0]">
                      <img
                        src="/images/landing/step-selfie.png"
                        alt="Take a quick selfie"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[220px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Take a quick selfie
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1 leading-snug">
                    Snap a clear selfie so we can find you in the event photos.
                  </p>
                </div>

                {/* Arrow to Step 3 (Desktop) */}
                <div className="hidden md:flex absolute -right-6 top-32 -translate-y-1/2 z-20 text-[#E65A15]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              </div>

              {/* Step 03 */}
              <div className="relative flex flex-col items-center">
                <div className="relative w-full max-w-[270px]">
                  {/* Step Top Pill Badge */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#FAF6F0] border border-[#EADECF] shadow-sm rounded-full px-3 py-0.5">
                    <span className="w-4 h-4 rounded-full bg-[#E65A15] text-white text-[10px] font-bold flex items-center justify-center">03</span>
                    <span className="text-[11px] font-semibold text-[#2D1807]">Find</span>
                  </div>

                  {/* Card Container with Native High-Res PNG */}
                  <div className="bg-[#FAF6F0] border border-[#EADECF] rounded-3xl p-3 pt-4 shadow-[0_12px_28px_rgba(110,65,30,0.07)]">
                    <div className="rounded-2xl overflow-hidden aspect-square bg-[#FAF6F0]">
                      <img
                        src="/images/landing/step-find.png"
                        alt="Get your photos"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Text below card */}
                <div className="text-center mt-5 max-w-[220px]">
                  <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                    Get your photos
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5C4D43] mt-1 leading-snug">
                    See all the photos from the event where you appear.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 3: THE EXPERIENCE ("A better way to relive your events") */}
        <section id="the-moments" className="py-14 sm:py-20 relative bg-[#FAF6F0]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              {/* Left Column: Full-Resolution Arched Portrait */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-[360px] lg:max-w-none">
                  <div className="rounded-[2.5rem] overflow-hidden border border-[#EADECF] shadow-[0_20px_45px_rgba(110,65,30,0.1)] aspect-[4/5] bg-[#FAF6F0]">
                    <img
                      src="/images/landing/event-memory.png"
                      alt="Smiling guest in festive wedding attire"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Title and 3 Feature Items */}
              <div className="lg:col-span-7 relative">
                <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-serif font-bold text-[#2D1807] leading-[1.18] tracking-tight">
                  A better way to relive<br />your events
                </h2>

                <div className="mt-8 space-y-6 sm:space-y-7">
                  {/* Feature 1 */}
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EDE1] border border-[#E8DEC8] flex items-center justify-center text-[#E65A15] shrink-0 shadow-sm">
                      <Icons.Image size={21} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                        Photos that matter
                      </h3>
                      <p className="text-[#5C4D43] text-sm leading-relaxed mt-0.5">
                        Quickly find the photos you&apos;re actually in from the event gallery.
                      </p>
                    </div>
                  </div>

                  {/* Feature 2 */}
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EDE1] border border-[#E8DEC8] flex items-center justify-center text-[#E65A15] shrink-0 shadow-sm">
                      <Icons.Users size={21} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                        Perfect for any event
                      </h3>
                      <p className="text-[#5C4D43] text-sm leading-relaxed mt-0.5">
                        Weddings, engagements, birthdays, and more.
                      </p>
                    </div>
                  </div>

                  {/* Feature 3 */}
                  <div className="flex items-start gap-4 sm:gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-[#F5EDE1] border border-[#E8DEC8] flex items-center justify-center text-[#E65A15] shrink-0 shadow-sm">
                      <Icons.Heart size={21} strokeWidth={2} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#2D1807]">
                        Simple and hassle-free
                      </h3>
                      <p className="text-[#5C4D43] text-sm leading-relaxed mt-0.5">
                        No searching through thousands of photos — just scan, selfie, and find.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Decorative flower branch on right side */}
                <div className="hidden lg:block absolute -right-6 -bottom-8 w-20 pointer-events-none select-none">
                  <img
                    src="/images/landing-v2/flower_branch.webp"
                    alt=""
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 4: ARE YOU A PHOTOGRAPHER? BANNER */}
        <section id="photographers" className="py-10 sm:py-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="relative rounded-3xl bg-gradient-to-r from-[#D85213] via-[#E65A15] to-[#EE6B26] p-6 sm:p-10 text-white shadow-xl shadow-orange-950/10 overflow-hidden">
              
              {/* Subtle background decorative pattern */}
              <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                {/* Left side: Icon + Radiating Rays + Headings */}
                <div className="flex items-start sm:items-center gap-4 sm:gap-5">
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-white shrink-0">
                    {/* Radiating shine rays */}
                    <svg className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-4 overflow-visible opacity-90" viewBox="0 0 32 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <line x1="16" y1="1" x2="16" y2="6" />
                      <line x1="7" y1="3" x2="10" y2="7.5" />
                      <line x1="25" y1="3" x2="22" y2="7.5" />
                    </svg>
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white shadow-inner">
                      <Icons.Camera size={26} strokeWidth={2} />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
                      Are you a photographer?
                    </h3>
                    <p className="text-orange-100/90 text-sm sm:text-base mt-1">
                      Give your clients a modern, effortless way to find their event photos.
                    </p>
                  </div>
                </div>

                {/* Right side: Button */}
                <a
                  href="/auth"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white hover:bg-orange-50/80 text-[#2D1807] font-bold text-sm sm:text-base rounded-2xl shadow-clay-card border border-white/80 transition-all duration-200 hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap"
                >
                  <Icons.Camera size={19} strokeWidth={2} />
                  <span>Set up my event</span>
                </a>
              </div>

            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="pt-10 pb-12 relative border-t border-[#F0E6D8]/80 bg-[#FAF6F0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          
          {/* Brand Info */}
          <div className="flex flex-col items-center sm:items-start">
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg border border-[#E65A15] flex items-center justify-center text-[#E65A15] bg-[#FAF6F0]">
                <Icons.Camera size={15} strokeWidth={2.2} />
              </div>
              <span className="font-serif font-bold text-xl text-[#2D1807] tracking-tight">Chobi Dao</span>
            </a>
            <span className="text-xs text-[#7A6B62] mt-1">AI event photo discovery</span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-8 text-sm">
            <a href="#how-it-works" className="text-[#2D1807] hover:text-[#E65A15] font-medium transition-colors">
              How it works
            </a>
            <a href="#photographers" className="text-[#2D1807] hover:text-[#E65A15] font-medium transition-colors">
              For photographers
            </a>
          </nav>
        </div>

        {/* Botanical leaf flourish in bottom right corner */}
        <div className="absolute right-0 bottom-0 w-24 sm:w-28 pointer-events-none select-none opacity-90">
          <img
            src="/images/landing-v2/botanical_corner.webp"
            alt=""
            className="w-full h-auto object-contain"
          />
        </div>
      </footer>
    </div>
  );
}
