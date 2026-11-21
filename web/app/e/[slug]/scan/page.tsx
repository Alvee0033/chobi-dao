"use client";

import { use, useState } from "react";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";
import { Toast } from "@/components/framefind/ui/Toast";
import { GuestLivenessPage } from "@/components/framefind/screens/GuestLivenessPage";

export default function EventScanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [toastMsg, setToastMsg] = useState("");

  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <BackgroundBlobs />
      <GuestLivenessPage slug={slug} showToast={setToastMsg} />
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}
