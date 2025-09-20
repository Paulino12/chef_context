"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { AppSidebar } from "./app-sidebar";

/**
 * Mobile drawer (≤ md). We reuse <AppSidebar/> for DRY nav.
 * Tailwind breakpoints:
 * - Hidden on md+ (the permanent sidebar is visible there).
 */
export function MobileNav({ className }: { className?: string }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>

      {/* Drawer from the left, fixed width similar to desktop sidebar */}
      <SheetContent side="left" className="p-0 w-72">
        <SheetHeader className="p-4">
          <SheetTitle>Chef Context</SheetTitle>
        </SheetHeader>
        <div className="border-t">
          <AppSidebar />
        </div>
      </SheetContent>
    </Sheet>
  );
}
