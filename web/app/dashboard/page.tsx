"use client";

import { useAuth } from "@/components/framefind/AuthProvider";
import { DashboardPage } from "@/components/framefind/screens/DashboardPage";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";
import { Toast } from "@/components/framefind/ui/Toast";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardRoute() {
  const { auth, isLoading, login, logout } = useAuth();
  const [toastMsg, setToastMsg] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !auth) {
      router.push("/");
    }
  }, [auth, isLoading, router]);

  if (isLoading || !auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // We mock setView since DashboardPage uses it to switch internal views 
  // or go back to main site.
  const handleSetView = (view: any) => {
    if (view === "landing") {
      router.push("/");
    } else if (view === "auth") {
      router.push("/auth");
    }
  };

  const handleAuth = (state: any) => {
    if (state === null) {
      logout();
    } else {
      login(state);
    }
  };

  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <BackgroundBlobs />
      <DashboardPage 
        auth={auth} 
        onAuth={handleAuth} 
        showToast={setToastMsg} 
        setView={handleSetView} 
      />
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}
