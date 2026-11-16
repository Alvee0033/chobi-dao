import { Icons } from "../icons";
import "./landing-page.css";

const steps = [
  { number: "01", title: "Open your event", description: "Scan the QR code from your photographer to open the right gallery.", icon: Icons.QrCode },
  { number: "02", title: "Scan your face", description: "A quick guided face scan helps find you from different angles.", icon: Icons.FaceId },
  { number: "03", title: "Find your photos", description: "See your matches together and save the moments you love.", icon: Icons.Image },
];

export function LandingPage() {
  return (
    <div className="cd-page">
      <header className="cd-header">
        <div className="cd-container cd-header-inner">
          <a className="cd-brand" href="/" aria-label="Chobi Dao home"><span className="cd-brand-mark" aria-hidden="true"><Icons.FaceId size={22} /></span><span>chobi<span className="cd-brand-accent">dao</span></span></a>
          <nav className="cd-nav" aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#why-chobi-dao">Why Chobi Dao</a><a href="#photographers">For photographers</a></nav>
          <a className="cd-button cd-button-primary cd-header-cta" href="/find">Find my photos <Icons.ChevronRight size={16} aria-hidden="true" /></a>
          <details className="cd-mobile-nav"><summary aria-label="Open navigation"><Icons.Menu size={24} aria-hidden="true" /></summary><nav aria-label="Mobile navigation"><a href="#how-it-works">How it works</a><a href="#why-chobi-dao">Why Chobi Dao</a><a href="#photographers">For photographers</a><a href="/find">Find my photos</a></nav></details>
        </div>
      </header>

      <main>
        <section className="cd-hero cd-container" aria-labelledby="hero-heading">
          <div className="cd-hero-copy">
            <p className="cd-eyebrow"><span className="cd-status-dot" /> THE EASIEST WAY BACK TO YOUR MOMENTS</p>
            <h1 id="hero-heading">You were there.<br /><em>We found the photos.</em></h1>
            <p className="cd-hero-lead">No endless scrolling through event albums. Scan your face once and see the photos you&apos;re in, all in one place.</p>
            <div className="cd-hero-actions"><a className="cd-button cd-button-primary cd-button-large" href="/find"><Icons.FaceId size={21} aria-hidden="true" /> Find my photos <span aria-hidden="true">↗</span></a><a className="cd-button cd-button-outline cd-button-large" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a></div>
            <p className="cd-hero-note"><Icons.CheckCircle size={16} aria-hidden="true" /> Made for weddings, parties, and every event worth keeping.</p>
          </div>
          <div className="cd-hero-visual" aria-label="Illustration of a face scan finding event photos" role="img">
            <div className="cd-visual-orbit cd-visual-orbit-one" /><div className="cd-visual-orbit cd-visual-orbit-two" />
            <div className="cd-visual-card cd-visual-event"><span className="cd-visual-icon"><Icons.QrCode size={23} /></span><span><strong>Event gallery</strong><small>Ready to explore</small></span><Icons.CheckCircle size={19} /></div>
            <div className="cd-visual-phone"><div className="cd-phone-top"><span /> <span>Face scan</span> <span /></div><div className="cd-face-frame"><span className="cd-face-outline"><Icons.FaceId size={92} /></span><i className="cd-scan-line" /></div><div className="cd-phone-caption"><span className="cd-status-dot" /> Looking good. Finding your moments...</div><div className="cd-phone-progress"><span /></div></div>
            <div className="cd-visual-card cd-visual-found"><span className="cd-found-icon"><Icons.Image size={22} /></span><span><strong>Your photos</strong><small>Matches found</small></span><span className="cd-found-check"><Icons.Check size={17} /></span></div>
            <div className="cd-visual-spark cd-spark-one"><Icons.Sparkles size={25} /></div><div className="cd-visual-spark cd-spark-two"><Icons.Sparkles size={18} /></div>
          </div>
          <a className="cd-scroll-cue" href="#how-it-works">SCROLL TO EXPLORE <span aria-hidden="true">↓</span></a>
        </section>

        <section className="cd-process" id="how-it-works" aria-labelledby="process-heading"><div className="cd-container"><div className="cd-section-heading"><p className="cd-kicker">HOW IT WORKS</p><h2 id="process-heading">Three steps to <em>your moments.</em></h2><p>Everything you need, nothing you don&apos;t.</p></div><div className="cd-steps">{steps.map(({ number, title, description, icon: Icon }) => <article className="cd-step" key={number}><div className="cd-step-top"><span>{number}</span><span className="cd-step-icon"><Icon size={30} aria-hidden="true" /></span></div><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>

        <section className="cd-benefits cd-container" id="why-chobi-dao" aria-labelledby="benefits-heading"><div className="cd-benefit-display" aria-hidden="true"><div className="cd-display-window"><div className="cd-display-bar"><span /><span /><span /></div><div className="cd-display-content"><div className="cd-display-badge"><Icons.Sparkles size={17} /> YOUR MOMENTS</div><div className="cd-display-grid"><div><Icons.Image size={35} /></div><div><Icons.Image size={35} /></div><div><Icons.Image size={35} /></div><div><Icons.Image size={35} /></div></div><div className="cd-display-footer"><span /><span /></div></div></div><div className="cd-display-tag"><Icons.CheckCircle size={19} /> All in one gallery</div></div><div className="cd-benefits-copy"><p className="cd-kicker">BUILT AROUND YOU</p><h2 id="benefits-heading">Every moment deserves to be <em>found.</em></h2><p className="cd-benefits-intro">From the first photo to the last dance, get straight to the memories that matter to you.</p><div className="cd-benefit-list"><div><span><Icons.FaceId size={23} /></span><div><h3>Photos that are yours</h3><p>See the moments you&apos;re in without searching the whole album.</p></div></div><div><span><Icons.Zap size={23} /></span><div><h3>Less searching, more remembering</h3><p>Go from a quick face scan to your matches in a few easy steps.</p></div></div><div><span><Icons.Lock size={23} /></span><div><h3>Only the right event</h3><p>Your search stays within the gallery you opened.</p></div></div></div></div></section>

        <section className="cd-pro-section cd-container" id="photographers" aria-labelledby="pro-heading"><div className="cd-pro-band"><div className="cd-pro-symbol"><Icons.Camera size={32} /></div><div><p className="cd-kicker">FOR PHOTOGRAPHERS</p><h2 id="pro-heading">Great photos deserve to be seen.</h2><p>Give every guest a simple way to find the moments you captured.</p></div><a className="cd-button cd-button-light" href="/auth">Create an event <span aria-hidden="true">↗</span></a></div></section>
      </main>

      <footer className="cd-footer cd-container"><a className="cd-brand" href="/"><span className="cd-brand-mark" aria-hidden="true"><Icons.FaceId size={18} /></span><span>chobi<span className="cd-brand-accent">dao</span></span></a><p>Find yourself in the moments that matter.</p><nav aria-label="Footer navigation"><a href="#how-it-works">How it works</a><a href="/auth">Photographers</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
    </div>
  );
}
