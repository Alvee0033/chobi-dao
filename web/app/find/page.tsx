"use client";

import { useState } from "react";
import { Toast } from "@/components/framefind/ui/Toast";
import { GuestStartPage } from "@/components/framefind/screens/GuestStartPage";

export default function FindPage() {
  const [toastMsg, setToastMsg] = useState("");

  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <GuestStartPage showToast={setToastMsg} />
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}
