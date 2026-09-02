import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "@/styles/index.css";

export const metadata: Metadata = {
  title: "Stravyx v.2 Pre-alpha",
  description:
    "Connect customers with drone operators through a user-friendly platform featuring real-time job tracking, view toggles, and secure information sharing.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full m-0">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
