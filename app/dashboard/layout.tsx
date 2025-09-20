// app/(dashboard)/layout.tsx
import { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "../components/app-header";
import { AppSidebar } from "../components/app-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh grid grid-cols-[260px_1fr]">
      <aside className="border-r bg-muted/30">
        <AppSidebar />
      </aside>
      <div className="flex flex-col">
        <AppHeader />
        <main className="p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
