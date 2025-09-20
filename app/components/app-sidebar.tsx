import Link from "next/link";

export function AppSidebar() {
  return (
    <nav className="p-4 text-sm space-y-2">
      <div className="text-xs uppercase text-muted-foreground mb-1">Tools</div>
      
      <Link
        href="/dashboard/tools/menu-generator"
        className="px-3 py-2 text-sm hover:underline"
      >
        Menu Generator
      </Link>
      {/* <a className="block px-2 py-1 rounded hover:bg-muted opacity-60" href="/dashboard/tools/invoices">
        Invoices (soon)
      </a> */}

      <div className="text-xs uppercase text-muted-foreground mt-4 mb-1">
        Resources
      </div>
      {/* <a
        className="block px-2 py-1 rounded hover:bg-muted"
        href="https://github.com/Paulino12/generate-menus#readme"
        target="_blank"
      >
        Docs
      </a> */}
    </nav>
  );
}
