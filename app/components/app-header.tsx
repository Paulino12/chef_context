"use client";

import { ReactNode } from "react";
import { NavLink } from "./nav-link";
import { LAYOUT } from "../lib/ui";

/**
 * Header is breakpoint-aware but simple:
 * - shows a left "start" slot (mobile hamburger)
 * - hides the top nav on very small screens (we use the sheet drawer there)
 */
export function AppHeader({ start }: { start?: ReactNode }) {
  return (
    <header
      className={[
        "border-b",
        LAYOUT.PAGE_X,
        LAYOUT.HEADER_Y,
        "flex items-center justify-between gap-2",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        {start /* e.g., <MobileNav /> shows only on mobile */}
        <NavLink
          href="/dashboard"
          className="px-0 py-0 text-base font-semibold hover:bg-transparent"
        >
          Chef Context
        </NavLink>
      </div>
    </header>
  );
}
