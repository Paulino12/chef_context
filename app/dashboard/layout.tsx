import { ReactNode } from "react";
import { AppHeader } from "../components/app-header";
import { AppSidebar } from "../components/app-sidebar";
import { MobileNav } from "../components/mobile-nav";
import { Toaster } from "@/components/ui/sonner";

/**
 * Responsive grid:
 * - 1 column on mobile
 * - From md+: [sidebar content]
 * - Sidebar is sticky so its background always spans full height.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        grid min-h-[100svh]
        grid-cols-1
        md:[grid-template-columns:16rem_1fr]  /* literal value so Tailwind can generate it */
        items-stretch
      "
    >
      {/* Sidebar: hidden on mobile, sticky full-height on md+ */}
      <aside className="hidden md:block sticky top-0 h-[100svh] border-r bg-muted/30 overflow-auto">
        <AppSidebar />
      </aside>

      {/* Content column */}
      <div className="flex min-h-[100svh] flex-col">
        <AppHeader start={<MobileNav className="md:hidden" />} />
        <main className="flex-1 px-4 md:px-6 py-4 md:py-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
