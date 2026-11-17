import { Icons } from "../icons";
import "./landing-page.css";

const steps = [
  { number: "01", label: "SCAN", title: "Enter the event", description: "Open the gallery with your event’s QR code or link.", image: "/images/landing/step-scan.webp", icon: Icons.QrCode },
  { number: "02", label: "SMILE", title: "Show us your face", description: "A guided scan captures different angles in seconds.", image: "/images/landing/step-selfie.webp", icon: Icons.FaceId },
  { number: "03", label: "DISCOVER", title: "Find your moments", description: "Your matching photos arrive in one beautiful gallery.", image: "/images/landing/step-find.webp", icon: Icons.Image },
];

export function LandingPage() {
  return (
    <div className="cd-page">
      <header className="cd-header">
        <div className="cd-container cd-header-inner">
          <a className="cd-brand" href="/" aria-label="Chobi Dao home"><span className="cd-brand-mark" aria-hidden="true"><Icons.FaceId size={21} /></span><span>chobi<span>dao</span></span></a>
          <nav className="cd-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#the-moments">The experience</a><a href="#photographers">For photographers</a></nav>
          <a className="cd-button cd-button-nav" href="/find">Find my photos <span aria-hidden="true">↗</span></a>
          <details className="cd-mobile-nav"><summary aria-label="Open navigation"><Icons.Menu size={24} aria-hidden="true" /></summary><nav aria-label="Mobile navigation"><a href="#how-it-works">How it works</a><a href="#the-moments">The experience</a><a href="#photographers">For photographers</a><a href="/find">Find my photos</a></nav></details>
        </div>
      </header>

      <main>
        <section className="cd-hero cd-container" aria-labelledby="hero-heading">
          <div className="cd-hero-copy">
            <div className="cd-overline"><span className="cd-overline-line" /> THE PHOTOS YOU WERE IN, FINALLY FOUND</div>
            <h1 id="hero-heading">Every moment<br />has <em>your story.</em></h1>
            <p>That laugh. That dance. That photo you didn’t know existed. Find yourself in every event gallery with a simple face scan.</p>
            <div className="cd-hero-actions"><a className="cd-button cd-button-main" href="/find"><Icons.FaceId size={21} aria-hidden="true" /> Find my photos <span aria-hidden="true">↗</span></a><a className="cd-button cd-button-quiet" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
            <div className="cd-hero-assurance"><span><Icons.CheckCircle size={17} aria-hidden="true" /> Simple to use</span><span><Icons.Lock size={17} aria-hidden="true" /> Your event only</span></div>
          </div>
          <div className="cd-hero-stage">
            <div className="cd-hero-photo-wrap"><img src="/images/landing/event-hero.webp" width="1300" height="867" alt="Friends laughing and dancing together at a celebration" fetchPriority="high" decoding="async" /></div>
            <div className="cd-hero-photo-glow" aria-hidden="true" />
            <div className="cd-match-card" aria-hidden="true"><div className="cd-match-icon"><Icons.Sparkles size={24} /></div><div><strong>Your moments, found.</strong><span>See the photos you&apos;re in</span></div><span className="cd-match-arrow">↗</span></div>
            <div className="cd-hero-vertical" aria-hidden="true">A BETTER WAY TO RELIVE IT ALL <span>✳</span></div>
          </div>
          <a className="cd-scroll" href="#how-it-works">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a>
        </section>

        <section className="cd-process" id="how-it-works" aria-labelledby="process-heading"><div className="cd-container"><div className="cd-section-intro"><p className="cd-kicker">AS EASY AS ONE, TWO, THREE</p><h2 id="process-heading">Less searching.<br /><em>More remembering.</em></h2><p>From the event to your own gallery, it just flows.</p></div><div className="cd-steps">{steps.map(({ number, label, title, description, image, icon: Icon }) => <article className="cd-step" key={number}><div className="cd-step-media"><img src={image} alt="" width="620" height="620" loading="lazy" decoding="async" /><span className="cd-step-pill"><Icon size={16} aria-hidden="true" /> {label}</span></div><div className="cd-step-text"><span>{number} / 03</span><h3>{title}</h3><p>{description}</p></div></article>)}</div></div></section>

        <section className="cd-moments cd-container" id="the-moments" aria-labelledby="moments-heading"><div className="cd-moments-picture"><img src="/images/landing/event-memory.webp" width="840" height="1049" alt="Friends enjoying a warm celebration together" loading="lazy" decoding="async" /><span className="cd-picture-note">THE MOMENTS YOU DIDN&apos;T WANT TO MISS <span>↗</span></span></div><div className="cd-moments-copy"><span className="cd-kicker">YOUR MEMORY LANE, MADE EASY</span><h2 id="moments-heading">The best photos aren&apos;t always the ones <em>you took.</em></h2><p>Somewhere in that gallery is the candid laugh, the group hug, the dance floor moment. Chobi Dao helps you find it without digging through hundreds of photos.</p><ul><li><Icons.FaceId size={22} aria-hidden="true" /><span>Find photos of you across the event</span></li><li><Icons.Image size={22} aria-hidden="true" /><span>See every match together in your gallery</span></li><li><Icons.Download size={22} aria-hidden="true" /><span>Save the memories you want to keep</span></li></ul><a className="cd-text-link" href="/find">Find your moments <span aria-hidden="true">↗</span></a></div></section>

        <section className="cd-photographers cd-container" id="photographers" aria-labelledby="photographers-heading"><div className="cd-photographers-inner"><div className="cd-photographers-icon"><Icons.Camera size={32} aria-hidden="true" /></div><div><span className="cd-kicker">MADE FOR THE PEOPLE BEHIND THE LENS</span><h2 id="photographers-heading">You capture the story.<br /><em>We help them find it.</em></h2><p>Give every guest a thoughtful way to discover the photos you made.</p></div><a className="cd-button cd-button-light" href="/auth">Create an event <span aria-hidden="true">↗</span></a></div></section>
      </main>

      <footer className="cd-footer cd-container"><a className="cd-brand" href="/"><span className="cd-brand-mark" aria-hidden="true"><Icons.FaceId size={18} /></span><span>chobi<span>dao</span></span></a><p>Find yourself in the moments that matter.</p><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="/auth">Photographers</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
    </div>
  );
}
