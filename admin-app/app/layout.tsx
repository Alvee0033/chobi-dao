import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = { title: "Chobi Dao · Operations", description: "Private SaaS operations console" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
