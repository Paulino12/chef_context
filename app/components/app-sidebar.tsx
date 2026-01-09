"use client";

import { TOOLS } from "../lib/tools";
import { NavLink } from "./nav-link";

/**
 * Sidebar is visible from md+ (desktop/tablet).
 * In mobile we show <MobileNav/> instead (sheet drawer).
 */
export function AppSidebar() {
  return (
    <nav className="p-4 text-sm space-y-3">
      <div>
        <div className="mb-1 text-xs uppercase text-muted-foreground">
          Tools
        </div>
        <div className="space-y-1">
          <NavLink href="/dashboard">Dashboard</NavLink>
          {TOOLS.map((tool) => (
            <NavLink key={tool.id} href={tool.href}>
              {tool.title}
            </NavLink>
          ))}
        </div>
      </div>

      <div>
        <div className="mt-4 mb-1 text-xs uppercase text-muted-foreground">
          Resources
        </div>
        <a
          className="block rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
          href="https://github.com/Paulino12/generate-menus#readme"
          target="_blank"
          rel="noreferrer"
        >
          Docs
        </a>
      </div>
    </nav>
  );
}
