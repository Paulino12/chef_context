"use client";
import Link from "next/link";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

export function AppHeader() {
  return (
    <header className="h-14 border-b px-4 flex items-center justify-between">
      <div className="font-semibold">Chef Context</div>
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem>
            <Link
              href="/dashboard"
              className="px-3 py-2 text-sm hover:underline"
            >
              Dashboard
            </Link>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <Link
              href="/dashboard/tools/menu-generator"
              className="px-3 py-2 text-sm hover:underline"
            >
              Menu Generator
            </Link>
          </NavigationMenuItem>
          {/* add more top links if you like */}
        </NavigationMenuList>
      </NavigationMenu>
    </header>
  );
}
