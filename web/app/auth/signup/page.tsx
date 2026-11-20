"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/framefind/AuthProvider";
import { AuthPage } from "@/components/framefind/screens/AuthPage";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";
import { Toast } from "@/components/framefind/ui/Toast";
import { AuthRouteTransition } from "@/components/framefind/screens/AuthRouteTransition";

export default function SignupRoute() {
  const { auth, isLoading, login } = useAuth();
  const [toastMsg, setToastMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && auth) router.replace("/dashboard");
  }, [auth, isLoading, router]);

  if (isLoading || auth) return <AuthRouteTransition message={auth ? "Opening your studio" : "Checking your studio"} />;

  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <BackgroundBlobs />
      <AuthPage
        initialMode="signup"
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
