"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/framefind/AuthProvider";
import { AuthPage } from "@/components/framefind/screens/AuthPage";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";
import { Toast } from "@/components/framefind/ui/Toast";

export default function LoginRoute() {
  const { auth, isLoading, login } = useAuth();
  const [toastMsg, setToastMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && auth) router.replace("/dashboard");
  }, [auth, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <BackgroundBlobs />
      <AuthPage
        initialMode="login"
        onModeChange={(mode) => router.push(mode === "login" ? "/auth/login" : "/auth/signup")}
        onAuth={(state) => {
          if (state) login(state);
        }}
        showToast={setToastMsg}
        setView={(view) => {
          if (view === "landing") router.push("/");
          if (view === "dashboard") router.push("/dashboard");
        }}
      />
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}
