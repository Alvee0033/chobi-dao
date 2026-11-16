"use client";

import { useState } from "react";
import { Icons } from "../icons";
import "./landing-page.css";

const steps = [
  { number: "01", title: "Scan", heading: "Scan the event QR", description: "Scan the event QR code to open your gallery.", image: "/images/landing/step-scan.png", alt: "Phone scanning an event QR code" },
  { number: "02", title: "Selfie", heading: "Take a quick selfie", description: "Take a selfie so we know which moments are yours.", image: "/images/landing/step-selfie.png", alt: "Selfie camera framing a guest's face" },
  { number: "03", title: "Find", heading: "Get your photos", description: "See your matches and keep the photos you love.", image: "/images/landing/step-find.png", alt: "Gallery of matched event photos" },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="cd-page">
      <header className="cd-header">
        <div className="cd-container cd-header-inner">
          <a className="cd-brand" href="/" aria-label="Chobi Dao home"><img src="/logo.png" alt="" width="38" height="38" /><span>Chobi Dao</span></a>
          <nav className={`cd-nav ${menuOpen ? "cd-nav-open" : ""}`} aria-label="Main navigation">
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
            <a href="#photographers" onClick={() => setMenuOpen(false)}>For photographers</a>
          </nav>
          <a className="cd-button cd-button-primary cd-header-cta" href="/find"><Icons.FaceId size={18} aria-hidden="true" /> Find my photos</a>
          <button className="cd-menu-toggle" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <Icons.X size={22} /> : <Icons.Menu size={22} />}</button>
        </div>
      </header>

      <main>
        <section className="cd-hero cd-container" aria-labelledby="hero-heading">
          <div className="cd-hero-copy">
            <p className="cd-eyebrow"><span /> AI photo discovery for real events</p>
            <h1 id="hero-heading">Your event photos.<br /><em>Found by your face.</em></h1>
            <p className="cd-hero-lead">Scan your event’s QR code, take a selfie, and find the photos you’re in—all in one beautiful gallery.</p>
            <div className="cd-hero-actions">
              <a className="cd-button cd-button-primary cd-button-large" href="/find"><Icons.FaceId size={22} aria-hidden="true" />Find my photos <span aria-hidden="true">→</span></a>
              <a className="cd-button cd-button-soft cd-button-large" href="/auth"><Icons.Camera size={21} aria-hidden="true" />I’m a photographer</a>
            </div>
          </div>
          <div className="cd-hero-art"><img src="/images/landing/hero-match-flow.png" alt="Event gallery, selfie scan, and matched photos connected in one flow" /></div>
        </section>

        <section className="cd-process" id="how-it-works" aria-labelledby="process-heading">
          <div className="cd-container">
            <p className="cd-section-kicker">How it works</p>
            <h2 id="process-heading">It’s simple: <span>Scan · Selfie · Find</span></h2>
            <div className="cd-steps">
              {steps.map((step) => (
                <article className="cd-step" key={step.number}>
                  <div className="cd-step-image"><img src={step.image} alt={step.alt} loading="lazy" /><span className="cd-step-number">{step.number} <strong>{step.title}</strong></span></div>
                  <h3>{step.heading}</h3><p>{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cd-benefits cd-container" aria-labelledby="benefits-heading">
          <div className="cd-memory-art"><img src="/images/landing/event-memory.png" alt="Guest laughing with friends at a celebration" loading="lazy" /></div>
          <div className="cd-benefits-copy">
            <p className="cd-section-kicker">Made for the moments that matter</p>
            <h2 id="benefits-heading">A better way to<br /><em>relive your events.</em></h2>
            <div className="cd-benefit-list">
              <div><span className="cd-benefit-icon"><img src="/images/landing/icon-face-clay.png" alt="" /></span><div><h3>Photos that are yours</h3><p>Find the moments you’re actually in, without searching through an entire album.</p></div></div>
              <div><span className="cd-benefit-icon"><img src="/images/landing/icon-camera-clay.png" alt="" /></span><div><h3>Made for every celebration</h3><p>From weddings and birthdays to the events you’ll never forget.</p></div></div>
              <div><span className="cd-benefit-icon"><img src="/images/landing/icon-lock-clay.png" alt="" /></span><div><h3>Your gallery, your pace</h3><p>Browse your matches and save the memories you want to keep.</p></div></div>
            </div>
          </div>
        </section>

        <section className="cd-pro-section cd-container" id="photographers" aria-labelledby="pro-heading">
          <div className="cd-pro-band"><span className="cd-pro-symbol"><img src="/images/landing/icon-camera-clay.png" alt="" /></span><div><p className="cd-pro-kicker">For photographers</p><h2 id="pro-heading">Let every guest find their moment.</h2><p>Give your clients a beautiful way to discover the photos you captured.</p></div><a className="cd-button cd-button-cream" href="/auth">Set up my event <span aria-hidden="true">→</span></a></div>
        </section>
      </main>

      <footer className="cd-footer cd-container"><a className="cd-brand" href="/"><img src="/logo.png" alt="" width="32" height="32" /><span>Chobi Dao</span></a><p>AI event photo discovery</p><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="/auth">For photographers</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
    </div>
  );
}
