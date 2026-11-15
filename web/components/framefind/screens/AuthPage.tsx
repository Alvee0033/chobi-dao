import { FormEvent, useState } from "react";
import { login, signup } from "@/lib/api";
import { Icons } from "../icons";
import type { DashboardAuthState, ShowToast, ViewSetter } from "../types";
import { ClayButton } from "../ui/ClayButton";
import { ClayCard } from "../ui/ClayCard";

type Mode = "login" | "signup";

export function AuthPage({ setView, showToast, onAuth, initialMode = "login", onModeChange }: { setView: ViewSetter; showToast: ShowToast; onAuth: (auth: DashboardAuthState) => void; initialMode?: Mode; onModeChange?: (mode: Mode) => void }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast("Email and password are required");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      showToast("Name is required for signup");
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
        driveRootFolderId: payload.photographer.driveRootFolderId ?? null
      });
      showToast(mode === "signup" ? "Account created" : "Logged in");
      setView("dashboard");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 relative overflow-hidden" data-testid="auth-page">
      {/* BACKGROUND ELEMENTS */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/30 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-100/20 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2" />

      {/* BACK BUTTON */}
      <button 
        onClick={() => setView("landing")} 
        className="absolute top-8 left-8 flex items-center gap-2 text-charcoal/40 font-black text-[10px] uppercase tracking-[0.2em] hover:text-orange-500 transition-all group"
      >
        <Icons.ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Back to Home
      </button>

      <div className="w-full max-w-md relative z-10">
        {/* LOGO & HEADER */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 relative group cursor-pointer" onClick={() => setView("landing")}>
            <div className="absolute inset-0 bg-orange-500/10 blur-2xl rounded-full scale-0 group-hover:scale-100 transition-transform duration-500" />
            <img src="/logo.png" alt="Chobi Dao" className="w-full h-full object-contain relative transition-transform duration-500 group-hover:scale-110" />
          </div>
          <h1 className="text-3xl font-black text-charcoal tracking-tighter mb-2">
            Photographer <span className="text-orange-500">Portal</span>
          </h1>
          <p className="text-sm font-bold text-charcoal/40 uppercase tracking-widest">
            {mode === "login" ? "Welcome back, Pro" : "Join the Elite Network"}
          </p>
        </div>

        {/* AUTH CARD */}
        <ClayCard className="p-2 sm:p-2 border-0 bg-white/60 backdrop-blur-xl shadow-clay-card rounded-[40px]">
          <div className="p-6 pt-8 space-y-8">
            {/* TABS */}
            <div className="flex p-1.5 bg-[#F5F4F0] rounded-[24px] shadow-inner">
              <button 
                type="button" 
                className={`flex-1 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${mode === "login" ? "bg-white text-orange-500 shadow-clay-card" : "text-charcoal/30 hover:text-charcoal/60"}`} 
                onClick={() => { setMode("login"); onModeChange?.("login"); }}
              >
                Login
              </button>
              <button 
                type="button" 
                className={`flex-1 py-3 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all ${mode === "signup" ? "bg-white text-orange-500 shadow-clay-card" : "text-charcoal/30 hover:text-charcoal/60"}`} 
                onClick={() => { setMode("signup"); onModeChange?.("signup"); }}
              >
                Join Now
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-charcoal/40 ml-4">Full Name</label>
                  <input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter your name" 
                    className="w-full bg-[#FAF9F6] border border-charcoal/5 px-6 py-4 rounded-[20px] font-bold text-charcoal text-sm placeholder:text-charcoal/20 shadow-clay-pressed focus:outline-none focus:bg-white focus:border-orange-500/20 transition-all"
                  />
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-charcoal/40 ml-4">Email Address</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@studio.com" 
                  className="w-full bg-[#FAF9F6] border border-charcoal/5 px-6 py-4 rounded-[20px] font-bold text-charcoal text-sm placeholder:text-charcoal/20 shadow-clay-pressed focus:outline-none focus:bg-white focus:border-orange-500/20 transition-all"
                />
              </div>

              <div className="space-y-1.5 pb-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-charcoal/40 ml-4">Secure Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••" 
                  className="w-full bg-[#FAF9F6] border border-charcoal/5 px-6 py-4 rounded-[20px] font-bold text-charcoal text-sm placeholder:text-charcoal/20 shadow-clay-pressed focus:outline-none focus:bg-white focus:border-orange-500/20 transition-all"
                />
              </div>

              <ClayButton 
                type="submit" 
                className="w-full h-16 text-lg !rounded-[24px] shadow-clay-btn relative overflow-hidden group"
                disabled={loading}
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {loading ? (
                    <Icons.Activity className="animate-spin" size={20} />
                  ) : (
                    <>
                      {mode === "signup" ? "Start Creating" : "Access Studio"}
                      <Icons.ChevronRight size={20} />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              </ClayButton>
            </form>
          </div>
        </ClayCard>

      </div>
    </div>
  );
}
