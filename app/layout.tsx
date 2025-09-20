import "./globals.css";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

export const metadata: Metadata = {
  title: "Chef Context",
  description: "Chef tools dashboard",
};

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      {/* Make sure small devices scale properly */}
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>

      {/* h-full + min-h-[100svh] ensures children can stretch to viewport height */}
      <body 
      className={`h-full min-h-[100svh] bg-background font-sans antialiased ${montserrat.className}`}>
        {children}
      </body>
    </html>
  );
}
