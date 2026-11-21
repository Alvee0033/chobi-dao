import type { ReactNode } from "react";
import { UploadManagerProvider } from "@/components/framefind/screens/dashboard/UploadManager";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <UploadManagerProvider>{children}</UploadManagerProvider>;
}
