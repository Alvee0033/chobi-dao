"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type SearchPhoto, getPublicPersonPhotos } from "@/lib/api";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";
import { Toast } from "@/components/framefind/ui/Toast";
import { GuestGalleryPage } from "@/components/framefind/screens/GuestGalleryPage";
import { clearGuestSearchSession, loadGuestSearchSession } from "@/components/framefind/guest-session";

function EventPhotosContent({ params }: { params: { slug: string } }) {
  const [toastMsg, setToastMsg] = useState("");
  const [photos, setPhotos] = useState<SearchPhoto[] | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const personId = searchParams ? searchParams.get("personId") : null;

  useEffect(() => {
    if (personId) {
      getPublicPersonPhotos(params.slug, personId)
        .then(res => {
          setPhotos(res);
          setSessionToken("public-person-share");
        })
        .catch(err => {
          console.error("Failed to load person photos:", err);
          setToastMsg("Could not load person's photos");
          router.replace(`/e/${encodeURIComponent(params.slug)}`);
        });
    } else {
      const session = loadGuestSearchSession(params.slug);
      if (!session) {
        router.replace(`/e/${encodeURIComponent(params.slug)}`);
        return;
      }
      setPhotos(session.photos);
      setSessionToken(session.sessionToken);
    }
  }, [params.slug, personId, router]);

  if (!photos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative font-sans selection:bg-orange-200 selection:text-orange-900">
      <BackgroundBlobs />
      <GuestGalleryPage
        slug={params.slug}
        photos={photos}
        sessionToken={sessionToken}
        showToast={setToastMsg}
        onStartOver={() => {
          clearGuestSearchSession(params.slug);
          router.push(`/e/${params.slug}`);
        }}
      />
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}

export default function EventPhotosPage({ params }: { params: { slug: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EventPhotosContent params={params} />
    </Suspense>
  );
}
