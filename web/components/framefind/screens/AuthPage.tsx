import { FormEvent, useEffect, useState } from "react";
import { login, resendEmailCode, signup, verifyEmailCode } from "@/lib/api";
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
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => setMode(initialMode), [initialMode]);
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setVerificationStep(false);
    setVerificationCode("");
    setError("");
    onModeChange?.(nextMode);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (verificationStep && !/^\d{6}$/.test(verificationCode)) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!verificationStep && (!email.trim() || !password.trim() || (mode === "signup" && !name.trim()))) {
      setError("Complete all required fields to continue.");
      return;
    }

    try {
      setLoading(true);
      if (mode === "signup" && !verificationStep) {
        await signup(email.trim().toLowerCase(), password, name.trim());
        setVerificationStep(true);
        setResendSeconds(60);
        showToast("Verification code sent to your email");
        return;
      }
      const payload = verificationStep
        ? await verifyEmailCode(email.trim().toLowerCase(), verificationCode)
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
      showToast(verificationStep ? "Email verified. Your account is ready." : "Logged in");
      setView("dashboard");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Authentication failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setError("");
    try {
      setLoading(true);
      await resendEmailCode(email.trim().toLowerCase());
      setResendSeconds(60);
      showToast("A new verification code has been sent");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send a new code.");
    } finally { setLoading(false); }
  };

  const startExistingVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return;
    setError("");
    setVerificationStep(true);
    setResendSeconds(60);
    try {
      await resendEmailCode(normalizedEmail);
      showToast("Verification code sent to your email");
    } catch {
      setError("A recent code may still be valid. Check your inbox, or request a new one in a minute.");
    }
  };

  return (
    <main className="studio-auth" data-testid="auth-page">
      <section className="studio-auth-form-side">
        <a className="studio-auth-mobile-brand" href="/" onClick={(event) => { event.preventDefault(); setView("landing"); }}><img src="/assets/chobidao.webp" alt="" />Chobi Dao <span>Studio</span></a>
        <button className="studio-auth-back" type="button" onClick={() => setView("landing")}><Icons.ChevronLeft size={16} /> Back to site</button>
        <div className="studio-auth-form-wrap">
          <div className="studio-auth-form-heading"><span className="studio-auth-overline">{verificationStep ? "EMAIL VERIFICATION" : "YOUR PHOTOGRAPHER ACCOUNT"}</span><h2>{verificationStep ? <>Check your<br />inbox<span className="studio-auth-period">.</span></> : mode === "login" ? <>Welcome<br />back<span className="studio-auth-period">.</span></> : <>A studio of<br />your own<span className="studio-auth-period">.</span></>}</h2><p>{verificationStep ? <>We sent a 6-digit code to <strong>{email}</strong>. Enter it below to finish creating your account.</> : mode === "login" ? "Sign in to manage your events and photo galleries." : "Create your photographer account and start sharing."}</p></div>
          {mode === "signup" && !verificationStep && <div className="studio-auth-trial"><Icons.Sparkles size={15} /><span>14 days of Pro included · no auto-charge</span></div>}
          {!verificationStep && <div className="studio-auth-tabs" role="tablist" aria-label="Account access"><button role="tab" aria-selected={mode === "login"} type="button" onClick={() => changeMode("login")}>Sign in</button><button role="tab" aria-selected={mode === "signup"} type="button" onClick={() => changeMode("signup")}>Create account</button></div>}
          <form onSubmit={submit} data-testid="auth-form" className="studio-auth-form">
            {verificationStep ? <div className="studio-auth-field"><label htmlFor="studio-code">6-digit verification code</label><input id="studio-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" required /></div> : <>
              {mode === "signup" && <div className="studio-auth-field"><label htmlFor="studio-name">Full name</label><input id="studio-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></div>}
              <div className="studio-auth-field"><label htmlFor="studio-email">Email address</label><input id="studio-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@studio.com" required /></div>
              <div className="studio-auth-field"><label htmlFor="studio-password">Password</label><div className="studio-auth-password"><input id="studio-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button></div></div>
            </>}
            {error && <p className="studio-auth-error" role="alert">{error}</p>}
            <button className="studio-auth-submit" type="submit" disabled={loading}>{loading ? "Please wait…" : verificationStep ? "Verify email" : mode === "login" ? "Sign in" : "Create account"}<span aria-hidden="true">→</span></button>
          </form>
          {!verificationStep && (mode === "login" && error.includes("Verify your email") || mode === "signup" && error.includes("verification email")) && <button className="studio-auth-existing-verify" type="button" onClick={startExistingVerification}>Continue email verification</button>}
          {verificationStep ? <div className="studio-auth-resend"><span>Didn’t receive the email?</span><button type="button" onClick={resendCode} disabled={loading || resendSeconds > 0}>{resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Send a new code"}</button><button className="studio-auth-change-email" type="button" onClick={() => { setVerificationStep(false); setVerificationCode(""); setError(""); }}>Change email</button></div> : <p className="studio-auth-footnote">Your event galleries, all in one place.</p>}
        </div>
        <div className="studio-auth-bottom">© Chobi Dao <span>Made for the moments that matter.</span></div>
      </section>
    </main>
  );
}
