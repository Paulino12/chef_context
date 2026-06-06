"use client";

import * as React from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOOLS } from "@/app/lib/tools";

type SiteHeaderProps = {
  session:
    | {
        name?: string | null;
        email?: string | null;
      }
    | null;
};

function isActiveRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navClass(isActive: boolean) {
  return buttonVariants({
    variant: isActive ? "secondary" : "ghost",
    size: "sm",
  });
}

export function SiteHeader({ session }: SiteHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const displayName = session?.name || session?.email || "";

  function renderNavItems(isMobile: boolean) {
    const itemClassName = isMobile ? "w-full justify-start" : "";
    const internalTools = TOOLS.filter((tool) => !tool.external);
    const recipeTool = TOOLS.find((tool) => tool.external);

    return (
      <>
        <Link
          href="/dashboard"
          className={cn(navClass(isActiveRoute(pathname, "/dashboard")), itemClassName)}
          onClick={() => setMobileMenuOpen(false)}
        >
          All tools
        </Link>
        {internalTools.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            className={cn(navClass(isActiveRoute(pathname, tool.href)), itemClassName)}
            onClick={() => setMobileMenuOpen(false)}
          >
            {tool.title}
          </Link>
        ))}
        {recipeTool ? (
          <Link
            href={session ? recipeTool.href : "/signin?callbackUrl=/dashboard"}
            target={session ? "_blank" : undefined}
            rel={session ? "noreferrer" : undefined}
            className={cn(navClass(false), itemClassName)}
            onClick={() => setMobileMenuOpen(false)}
          >
            Recipe Platform
          </Link>
        ) : null}
        {session ? (
          <Button
            size="sm"
            variant="outline"
            className={cn("cursor-pointer", itemClassName)}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            Sign out
          </Button>
        ) : (
          <Link
            href="/signin"
            className={cn(
              buttonVariants({
                variant: pathname === "/signin" ? "secondary" : "default",
                size: "sm",
              }),
              isMobile ? "w-full justify-start" : "min-w-20",
            )}
            onClick={() => setMobileMenuOpen(false)}
          >
            Sign in
          </Link>
        )}
      </>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur print:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/" className="shrink-0 font-semibold tracking-tight">
            Chef Context
          </Link>
          {displayName ? (
            <span className="hidden truncate rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground md:inline-flex">
              Hey, {displayName}
            </span>
          ) : null}
        </div>

        <nav className="hidden flex-wrap items-center gap-2 md:flex">
          {renderNavItems(false)}
        </nav>

        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "md:hidden")}
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-site-nav"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          <Menu className="size-4" />
        </button>
      </div>

      {mobileMenuOpen ? (
        <nav id="mobile-site-nav" className="border-t border-border/70 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 pb-4 pt-3 sm:px-6">
            {displayName ? (
              <span className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                Hey, {displayName}
              </span>
            ) : null}
            {renderNavItems(true)}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
