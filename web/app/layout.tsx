import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/framefind/AuthProvider";

export const metadata: Metadata = {
  title: "Chobi dao",
  description: "AI event photo retrieval",
  icons: {
    icon: "/assets/chobidao.webp",
    shortcut: "/assets/chobidao.webp",
    apple: "/assets/chobidao.webp",
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
