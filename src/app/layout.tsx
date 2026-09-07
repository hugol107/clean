import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa-register";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const fontSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const fontMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${APP_NAME} — Cleaning operations, verified by a tap`, template: `%s · ${APP_NAME}` },
  description: "Real-time cleaning operations powered by a simple NFC or QR tap. Know exactly when every space was cleaned.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfe" },
    { media: "(prefers-color-scheme: dark)", color: "#141420" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <SessionProvider session={session}>
            {children}
            <Toaster position="top-right" richColors closeButton />
            <PwaRegister />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
