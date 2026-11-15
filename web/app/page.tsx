import { LandingPage } from "@/components/framefind/screens/LandingPage";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";

export default function Page() {
  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <BackgroundBlobs />
      <LandingPage />
    </div>
  );
}
