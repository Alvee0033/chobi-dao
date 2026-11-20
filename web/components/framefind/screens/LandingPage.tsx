import Image from "next/image";
import Link from "next/link";
import { Icons } from "../icons";
import HeroCarousel from "./HeroCarousel";
import LandingReveal from "./LandingReveal";
import MemoriesSection from "./MemoriesSection";
import "./landing-page.css";

const steps = [
  {
    number: "01",
    tag: "SCAN",
    headline: "Scan the QR",
    description: "Open your event with a quick scan.",
    feature: "Opens right in your browser",
    image: "/images/landing/clay-scan-qr-light.png",
    alt: "Scanning event QR code with smartphone",
    icon: Icons.QrCode,
  },
  {
    number: "02",
    tag: "SELFIE",
    headline: "Take a selfie",
    description: "One selfie helps find the photos you’re in.",
    feature: "Private face matching",
    image: "/images/landing/clay-face-scan-light.png",
    alt: "Taking a selfie for private face matching",
    icon: Icons.FaceId,
  },
  {
    number: "03",
    tag: "YOUR PHOTOS",
    headline: "Find your photos",
    description: "Find your favorites. Download and keep them.",
    feature: "Download in full resolution",
    image: "/images/landing/clay-photo-gallery-light.png",
    alt: "Viewing matched celebration photos in gallery",
    icon: Icons.Download,
  },
];

function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`cd-brand${light ? " cd-brand-light" : ""}`} aria-label="Chobi Dao home">
      <span className="cd-brand-mark"><Image src="/assets/chobidao.webp" alt="" width={40} height={40} /></span>
      <span>Chobi Dao</span>
    </Link>
  );
}

function SiteHeader() {
  return (
    <header className="cd-header">
      <div className="cd-container cd-header-inner">
        <Brand light />
        <nav className="cd-nav" aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#experience">Experience</a>
          <a href="#plans">Plans</a>
          <a href="#photographers">For photographers</a>
        </nav>
        <Link href="/find" className="cd-button cd-button-nav">
          <Icons.FaceId size={17} /> Find my photos <Icons.ArrowRight size={15} />
        </Link>
        <details className="cd-mobile-nav">
          <summary aria-label="Open navigation"><span /><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#experience">Experience</a>
            <a href="#plans">Plans</a>
            <a href="#photographers">For photographers</a>
            <Link href="/find">Find my photos</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="cd-hero" aria-labelledby="hero-title">
      <div className="cd-hero-backdrop" aria-hidden="true" />
      <div className="cd-container cd-hero-inner">
        <div className="cd-hero-copy">
          <h1 id="hero-title"><span>Get your photos</span><em>instantly.</em></h1>
          <p className="cd-hero-description">Scan your event’s QR code and take a selfie.<br className="cd-desktop-break" /> Find and download the photos you’re in.</p>
          <div className="cd-hero-actions">
            <Link href="/find" className="cd-button cd-button-main"><Icons.FaceId size={18} /> Find photos <Icons.ArrowRight size={17} /></Link>
            <Link href="/auth" className="cd-button cd-button-photographer"><Icons.Camera size={18} /> Photographer login</Link>
          </div>
          <div className="cd-hero-assurance" aria-label="Guest benefits">
            <span><Icons.Lock size={14} /> Private matching. No app needed.</span>
          </div>
        </div>
        <HeroCarousel />
      </div>
      <svg className="cd-hero-wave" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 12 C145 70 265 101 420 82 C575 63 638 28 786 38 C944 49 1012 96 1162 86 C1292 77 1371 41 1440 12 L1440 100 L0 100 Z" />
      </svg>
      <a href="#how-it-works" className="cd-scroll"><span>↓</span> HOW IT WORKS</a>
    </section>
  );
}

function StepsSection() {
  return (
    <section className="cd-process" id="how-it-works" aria-labelledby="steps-title">
      <div className="cd-process-ambient" aria-hidden="true" />
      <div className="cd-container">
        <header className="cd-section-intro">
          <p className="cd-section-label">HOW IT WORKS</p>
          <h2 className="cd-section-title" id="steps-title"><span>Three simple steps.</span><em>Your photos, found.</em></h2>
          <p className="cd-section-sub">Scan the code, take a selfie, and find the moments you’re in.</p>
        </header>

        <div className="cd-flow">
          {steps.map((step, idx) => {
            const StepIcon = step.icon;
            return (
              <article className="cd-flow-step" key={step.number}>
                {idx < steps.length - 1 && <>
                  <svg className="cd-flow-link cd-flow-link-horizontal" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 50 C35 -20 65 120 100 50" pathLength="100" />
                    <path className="cd-flow-link-light" d="M0 50 C35 -20 65 120 100 50" pathLength="100" />
                  </svg>
                  <svg className="cd-flow-link cd-flow-link-vertical" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M50 0 C10 35 90 65 50 100" pathLength="100" />
                    <path className="cd-flow-link-light" d="M50 0 C10 35 90 65 50 100" pathLength="100" />
                  </svg>
                </>}
                <div className="cd-flow-heading">
                  <span className="cd-flow-number">{step.number}</span>
                  <StepIcon className="cd-flow-icon" size={17} aria-hidden="true" />
                  <span className="cd-step-tag">{step.tag}</span>
                </div>

                <div className="cd-flow-art">
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 760px) 88vw, 31vw"
                    priority={idx === 0}
                  />
                </div>

                <div className="cd-flow-copy">
                  <h3>{step.headline}</h3>
                  <p>{step.description}</p>
                  <div className="cd-flow-feature">
                    <Icons.Check size={14} />
                    <span>{step.feature}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="cd-process-cta">
          <div className="cd-process-cta-text">
            <strong>Ready to experience it?</strong>
            <span>Scan your event QR code or enter your code to see your gallery instantly.</span>
          </div>
          <Link href="/find" className="cd-button cd-button-main cd-process-btn">
            <Icons.FaceId size={18} /> Find your photos <Icons.ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PhotographerBanner() {
  return (
    <section className="cd-photographers cd-container" id="photographers">
      <div className="cd-photographers-inner">
        <div className="cd-camera-art" aria-hidden="true"><Icons.Camera size={45} /></div>
        <div className="cd-photographer-copy">
          <p className="cd-kicker">BUILT FOR PHOTOGRAPHERS</p>
          <h2>You capture the magic.<br />We help them find it.</h2>
          <p>Share one QR code. Give every guest their own memories.</p>
        </div>
        <span className="cd-banner-divider" />
        <Link href="/auth" className="cd-button cd-button-light"><Icons.Settings size={17} /> Set up my event <Icons.ArrowRight size={16} /></Link>
      </div>
    </section>
  );
}

function PlansSection() {
  return (
    <section className="cd-pricing" id="plans" aria-labelledby="plans-title">
      <div className="cd-container">
        <header className="cd-pricing-heading"><p className="cd-section-label">SIMPLE STUDIO PLANS</p><h2 id="plans-title">Room for every <em>memory.</em></h2><p>Start free. Move up when your galleries need more space.</p></header>
        <div className="cd-pricing-grid">
          <article className="cd-pricing-plan"><div className="cd-pricing-top"><div><span>01 / START HERE</span><h3>Free</h3><p>Everything you need to share a first gallery.</p></div><strong>৳0<small>forever</small></strong></div><ul><li><Icons.Check size={15} /> 1 GB storage</li><li><Icons.Check size={15} /> Up to 200 photos</li><li><Icons.Check size={15} /> 100 matches per month</li><li><Icons.Check size={15} /> QR event galleries</li></ul><Link href="/auth/signup" className="cd-pricing-link">Create a free account <Icons.ArrowRight size={16} /></Link></article>
          <article className="cd-pricing-plan cd-pricing-plan-pro"><div className="cd-pricing-ribbon">MADE FOR BUSY SEASONS</div><div className="cd-pricing-top"><div><span>02 / THE STUDIO PLAN</span><h3>Pro</h3><p>More breathing room, no match limits.</p></div><strong>৳399<small>per 30 days</small></strong></div><ul><li><Icons.Check size={15} /> 20 GB storage</li><li><Icons.Check size={15} /> Unlimited photo count</li><li><Icons.Check size={15} /> Unlimited face matching</li><li><Icons.Check size={15} /> Full-resolution downloads</li></ul><Link href="/auth/signup" className="cd-pricing-link cd-pricing-link-pro">Start with a 14-day Pro trial <Icons.ArrowRight size={16} /></Link><p className="cd-pricing-note">No auto-charge. Secure payment through UddoktaPay.</p></article>
        </div>
        <p className="cd-pricing-footnote">Every plan is built around private face matching and event galleries that open right in the browser.</p>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="cd-footer-shell">
      <div className="cd-footer cd-container">
      <div className="cd-footer-invitation">
        <div><p className="cd-kicker">THE CELEBRATION LIVES ON</p><h2>Good moments.<br /><em>Yours to keep.</em></h2></div>
        <Link href="/find" className="cd-footer-action"><span>Find your photos</span><span className="cd-footer-arrow"><Icons.ArrowRight size={25} /></span></Link>
      </div>
      <div className="cd-footer-brand"><Brand /><p>Capture the moments that matter.</p><div className="cd-socials"><a href="https://instagram.com" aria-label="Instagram"><Icons.Instagram size={17} /></a></div></div>
      <nav className="cd-footer-links" aria-label="Platform"><strong>PLATFORM</strong><Link href="/find">Find event photos</Link><a href="#how-it-works">How it works</a><a href="#photographers">For photographers</a><Link href="/auth">Photographer sign in</Link></nav>
      <nav className="cd-footer-links" aria-label="Plans"><strong>PLANS</strong><a href="#plans">Free plan</a><a href="#plans">Pro · ৳399 / month</a><Link href="/dashboard/billing">Billing portal</Link></nav>
      <nav className="cd-footer-links" aria-label="Privacy and security"><strong>PRIVACY &amp; SECURITY</strong><Link href="/terms">Privacy policy</Link><Link href="/terms">Terms of service</Link><Link href="/cookies">Cookie policy</Link></nav>
      <div className="cd-footer-signature" aria-hidden="true">Chobi Dao<span>✳</span></div>
      <div className="cd-footer-bottom"><span>© 2026 Chobi Dao. All rights reserved.</span><span>Made with care for celebration moments <Icons.Heart size={15} /></span></div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  return (
    <div className="cd-page">
      <SiteHeader />
      <main>
        <HeroSection />
        <StepsSection />
        <MemoriesSection />
        <PlansSection />
        <LandingReveal><PhotographerBanner /></LandingReveal>
      </main>
      <SiteFooter />
    </div>
  );
}
