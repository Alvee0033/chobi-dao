import { FormEvent, useEffect, useState } from "react";
import { login, signup } from "@/lib/api";
import { Icons } from "../icons";
import type { DashboardAuthState, ShowToast, ViewSetter } from "../types";
import "./auth-page.css";

type Mode = "login" | "signup";

type AuthPageProps = {
  setView: ViewSetter;
  showToast: ShowToast;
  onAuth: (auth: DashboardAuthState) => void;
  initialMode?: Mode;
  onModeChange?: (mode: Mode) => void;
};

export function AuthPage({ setView, showToast, onAuth, initialMode = "login", onModeChange }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMode(initialMode), [initialMode]);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    onModeChange?.(nextMode);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!email.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError("Complete all required fields to continue.");
      return;
    }

    try {
      setLoading(true);
      const payload = mode === "signup"
        ? await signup(email.trim().toLowerCase(), password, name.trim())
        : await login(email.trim().toLowerCase(), password);
      onAuth({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        userId: payload.photographer.id,
        email: payload.photographer.email,
        name: payload.photographer.name,
        plan: payload.photographer.plan,
        hasDriveConnected: payload.photographer.hasDriveConnected ?? Boolean(payload.photographer.driveRootFolderId),
        driveRootFolderId: payload.photographer.driveRootFolderId ?? null,
      });
      showToast(mode === "signup" ? "Account created" : "Logged in");
      setView("dashboard");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Authentication failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="studio-auth" data-testid="auth-page">
      <section className="studio-auth-story" aria-label="Chobi Dao for photographers">
        <img className="studio-auth-photo" src="/images/landing/event-memory.webp" alt="Guests enjoying a photographed celebration" width={840} height={1049} decoding="async" loading="lazy" />
        <div className="studio-auth-story-shade" />
        <a className="studio-auth-brand" href="/" onClick={(event) => { event.preventDefault(); setView("landing"); }}><img src="/logo-mark.webp" alt="" />Chobi Dao<span>Studio</span></a>
        <div className="studio-auth-story-copy"><span className="studio-auth-overline">The photographer workspace</span><h1>Make every<br />moment <em>findable.</em></h1><p>Create an event, deliver your gallery, and give every guest a way to find the photos they love.</p><div className="studio-auth-story-line"><span>01 / Create</span><span>02 / Share</span><span>03 / Discover</span></div></div>
      </section>

      <section className="studio-auth-form-side">
        <div className="studio-auth-mobile-brand"><img src="/logo-mark.webp" alt="" />Chobi Dao <span>Studio</span></div>
        <button className="studio-auth-back" type="button" onClick={() => setView("landing")}><Icons.ChevronLeft size={16} /> Back to site</button>
        <div className="studio-auth-form-wrap">
          <div className="studio-auth-form-heading"><span className="studio-auth-overline">Your creative workspace</span><h2>{mode === "login" ? "Welcome back." : "Start something beautiful."}</h2><p>{mode === "login" ? "Sign in to manage your events and galleries." : "Create your photographer account to begin."}</p></div>
          {mode === "signup" && <div className="studio-auth-trial"><Icons.Sparkles size={15} /><span>14 days of Pro included · no auto-charge</span></div>}
          <div className="studio-auth-tabs" role="tablist" aria-label="Account access"><button role="tab" aria-selected={mode === "login"} type="button" onClick={() => changeMode("login")}>Sign in</button><button role="tab" aria-selected={mode === "signup"} type="button" onClick={() => changeMode("signup")}>Create account</button></div>
          <form onSubmit={submit} data-testid="auth-form" className="studio-auth-form">
            {mode === "signup" && <div className="studio-auth-field"><label htmlFor="studio-name">Full name</label><input id="studio-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></div>}
            <div className="studio-auth-field"><label htmlFor="studio-email">Email address</label><input id="studio-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@studio.com" required /></div>
            <div className="studio-auth-field"><label htmlFor="studio-password">Password</label><div className="studio-auth-password"><input id="studio-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div></div>
            {error && <p className="studio-auth-error" role="alert">{error}</p>}
            <button className="studio-auth-submit" type="submit" disabled={loading}>{loading ? "Please wait…" : mode === "login" ? "Enter your studio" : "Create your account"}<span aria-hidden="true">→</span></button>
          </form>
          <p className="studio-auth-footnote">Your event galleries, all in one place.</p>
        </div>
        <div className="studio-auth-bottom">© Chobi Dao <span>Made for the moments that matter.</span></div>
      </section>
    </main>
  );
}
