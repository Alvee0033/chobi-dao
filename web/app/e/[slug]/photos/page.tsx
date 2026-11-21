"use client";

import { use, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { type SearchPhoto, getPublicPersonPhotos } from "@/lib/api";
import { BackgroundBlobs } from "@/components/framefind/ui/BackgroundBlobs";
import { Toast } from "@/components/framefind/ui/Toast";
import { GuestGalleryPage } from "@/components/framefind/screens/GuestGalleryPage";
import { clearGuestSearchSession, loadGuestSearchSession } from "@/components/framefind/guest-session";

function EventPhotosContent({ slug }: { slug: string }) {
  const [toastMsg, setToastMsg] = useState("");
  const [photos, setPhotos] = useState<SearchPhoto[] | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [indexingCount, setIndexingCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();
  const personId = searchParams ? searchParams.get("personId") : null;

  useEffect(() => {
    if (personId) {
      getPublicPersonPhotos(slug, personId)
        .then(res => {
          setPhotos(res);
          setSessionToken("public-person-share");
          setIndexingCount(0);
          setTotalCount(res.length);
          setNextOffset(res.length);
        })
        .catch(err => {
          console.error("Failed to load person photos:", err);
          setToastMsg("Could not load person's photos");
          router.replace(`/e/${encodeURIComponent(slug)}`);
        });
    } else {
      const session = loadGuestSearchSession(slug);
      if (!session) {
        router.replace(`/e/${encodeURIComponent(slug)}`);
        return;
      }
      setPhotos(session.photos);
      setSessionToken(session.sessionToken);
      setIndexingCount(session.indexingCount ?? 0);
      setTotalCount(session.totalCount ?? session.photos.length);
      setNextOffset(session.nextOffset ?? session.photos.length);
    }
  }, [slug, personId, router]);

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
        slug={slug}
        photos={photos}
        sessionToken={sessionToken}
        totalCount={totalCount}
        nextOffset={nextOffset}
        indexingCount={indexingCount}
        showToast={setToastMsg}
        onStartOver={() => {
          clearGuestSearchSession(slug);
          router.push(`/e/${slug}`);
        }}
      />
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />
    </div>
  );
}

export default function EventPhotosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-orange-50">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <EventPhotosContent slug={slug} />
    </Suspense>
  );
}
