"use client";

import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";

/** Tiny helper so we don’t import a classnames lib just for this demo. */
const cn = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

/**
 * Active-aware Link:
 * - `startsWith` lets you highlight entire sections (e.g., /dashboard/tools/*)
 */
export function NavLink({
  href, children, className, startsWith = false, ...rest
}: LinkProps & {
  children: React.ReactNode; className?: string; startsWith?: boolean;
}) {
  const pathname = usePathname();
  const hrefStr = typeof href === "string" ? href : href.pathname || "";
  const isActive = startsWith ? pathname.startsWith(hrefStr) : pathname === hrefStr;

  return (
    <Link
      {...rest}
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "block rounded-md px-2 py-1 text-sm transition-colors",
        "text-muted-foreground hover:text-foreground hover:bg-muted",
        isActive && "bg-muted font-bold text-foreground border border-border",
        className
      )}
    >
      {children}
    </Link>
  );
}
