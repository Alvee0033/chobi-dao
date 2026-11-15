"use client";

import { useState } from "react";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";
import { Toast } from "@/components/framefind/ui/Toast";
import { GuestLivenessPage } from "@/components/framefind/screens/GuestLivenessPage";

export default function EventScanPage({ params }: { params: { slug: string } }) {
  const [toastMsg, setToastMsg] = useState("");

  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <BackgroundBlobs />
      <GuestLivenessPage slug={params.slug} showToast={setToastMsg} />
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}
