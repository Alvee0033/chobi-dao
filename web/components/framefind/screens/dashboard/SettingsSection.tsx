import type { Dispatch, SetStateAction } from "react";
import type { DashboardAuthState, ShowToast } from "../../types";
import { Icons } from "../../icons";
import { ClayButton } from "../../ui/ClayButton";
import { ClayCard } from "../../ui/ClayCard";
import type { SettingsState } from "./model";

export function SettingsSection({ auth, settingsState, setSettingsState, showToast }: { auth: DashboardAuthState | null; settingsState: SettingsState; setSettingsState: Dispatch<SetStateAction<SettingsState>>; showToast: ShowToast }) {
  return (
    <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ClayCard className="p-8 border-orange-100 shadow-clay-card">
         <div className="flex items-center gap-8 mb-10">
           <div className="w-24 h-24 rounded-[32px] bg-orange-500 flex items-center justify-center text-white text-4xl font-black shadow-clay-pressed border-4 border-white relative group shrink-0">
             {auth?.name?.[0]?.toUpperCase() ?? "U"}
             <button onClick={() => showToast("Profile photo upload is not available yet")} className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-clay-card flex items-center justify-center text-orange-500 hover:scale-110 active:scale-95 transition-all border border-orange-50">
               <Icons.Camera className="w-5 h-5" />
             </button>
           </div>
           <div className="flex-1 min-w-0">
             <h3 className="text-2xl font-black text-charcoal mb-1 truncate">{auth?.name || "Photographer"}</h3>
             <p className="text-muted font-bold text-sm mb-4 truncate">{auth?.email || "No email linked"}</p>
             <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-clay-pressed">
                  Pro Plan
                </span>
                <span className="px-3 py-1 rounded-full bg-white text-charcoal text-[10px] font-black uppercase tracking-widest shadow-clay-card border border-orange-100">
                  Verified
                </span>
             </div>
           </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-orange-50">
           <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Display Name</label>
              <input type="text" defaultValue={auth?.name ?? ""} className="w-full bg-orange-50/30 border-0 px-4 py-4 rounded-2xl font-bold text-sm shadow-clay-pressed focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all" />
           </div>
           <div className="space-y-2">
              <label className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Professional Tagline</label>
              <input type="text" placeholder="e.g. Fine Art Wedding Photographer" className="w-full bg-orange-50/30 border-0 px-4 py-4 rounded-2xl font-bold text-sm shadow-clay-pressed focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition-all" />
           </div>
         </div>
      </ClayCard>

      <div className="grid grid-cols-1 gap-4">
        <ClayCard className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-orange-100 shadow-clay-card group hover:bg-orange-50/10 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center p-2 shadow-clay-card border border-orange-200 group-hover:scale-110 transition-transform shrink-0">
              <Icons.Zap size={24} />
            </div>
            <div>
              <h4 className="font-black text-charcoal flex items-center gap-2">
                Local Storage Bucket (MinIO / S3)
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h4>
              <p className="text-xs text-muted font-bold mt-0.5">
                Active & High Speed. All photos and WebP thumbnails are stored securely on your server.
              </p>
            </div>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-100 self-start sm:self-auto">
            100% Local & Fast
          </div>
        </ClayCard>
        {[
          { key: "publicProfile", title: "Public Profile", desc: "Allow others to find your portfolio", icon: Icons.Users },
          { key: "emailNotifications", title: "Email Notifications", desc: "Get notified when clients view photos", icon: Icons.Bell },
          { key: "autoOptimization", title: "Auto-Optimization", desc: "Compress images for faster loading", icon: Icons.Zap },
        ].map((setting, i) => (
          <ClayCard key={i} className="flex items-center justify-between p-6 border-orange-100 shadow-clay-card group hover:bg-orange-50/20 transition-colors">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-orange-500 shadow-clay-card border border-orange-50 group-hover:scale-110 transition-transform">
                <setting.icon className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-black text-charcoal">{setting.title}</h4>
                <p className="text-xs text-muted font-bold">{setting.desc}</p>
              </div>
            </div>
            <button
              onClick={() => {
                setSettingsState((prev) => {
                  const nextValue = !prev[setting.key as keyof typeof prev];
                  showToast(`${setting.title} ${nextValue ? "enabled" : "disabled"}`);
                  return { ...prev, [setting.key]: nextValue };
                });
              }}
              className={`w-14 h-8 rounded-full transition-all relative ${settingsState[setting.key as keyof typeof settingsState] ? 'bg-orange-500 shadow-clay-pressed' : 'bg-orange-100'}`}
            >
               <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-sm transition-all ${settingsState[setting.key as keyof typeof settingsState] ? 'right-1' : 'left-1'}`} />
            </button>
          </ClayCard>
        ))}
      </div>

      <div className="pt-8 flex items-center justify-between">
         <ClayButton onClick={() => showToast("Contact support to delete your account")} className="!bg-red-50 !text-red-500 !border-red-100 hover:!bg-red-500 hover:!text-white !shadow-none !rounded-2xl !py-4 px-8 font-black transition-all">
           Delete Account
         </ClayButton>
         <ClayButton onClick={() => showToast("Settings saved")} className="!rounded-2xl !py-4 px-12 shadow-clay-pressed font-black ring-4 ring-orange-100">
           Save Changes
         </ClayButton>
      </div>
    </div>
  );
}
