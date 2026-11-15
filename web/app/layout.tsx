import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/framefind/AuthProvider";

export const metadata: Metadata = {
  title: "Chobi dao",
  description: "AI event photo retrieval",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
