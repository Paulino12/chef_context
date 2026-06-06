import { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="mx-auto min-h-[calc(100vh-3.5rem)] max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </div>
      <Toaster />
    </>
  );
}
