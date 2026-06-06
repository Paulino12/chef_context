import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/app/components/site-header";
import { getServerAccessSession } from "@/lib/supabase/serverSession";

export const metadata: Metadata = {
  title: "Chef Context",
  description: "Chef tools dashboard",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerAccessSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}
      >
        <div className="min-h-screen">
          <SiteHeader
            session={
              session
                ? {
                    name: session.user.name,
                    email: session.user.email,
                  }
                : null
            }
          />
          {children}
        </div>
      </body>
    </html>
  );
}
