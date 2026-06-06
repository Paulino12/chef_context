const recipePlatformUrl =
  process.env.NEXT_PUBLIC_RECIPE_PLATFORM_URL ?? "http://localhost:3001";

export type Tool = {
  id: number;
  title: string;
  detail: string;
  description: string;
  href: string;
  cta?: string;
  external?: boolean;
  status?: string;
};

export const TOOLS: Tool[] = [
  {
    id: 1,
    title: "Menu Generator",
    detail: "DOCX to ZIP",
    description:
      "Upload your weekly menu and download a day-by-day pack ready to print and post.",
    href: "/dashboard/tools/menu-generator",
    status: "Live",
  },
  {
    id: 2,
    title: "Budget Analyzer",
    detail: "ZIP of .xlsx",
    description:
      "Upload Saffron outstanding orders and invoices to get a comparative budget.",
    href: "/dashboard/tools/budget-analyzer",
    status: "Live",
  },
  {
    id: 3,
    title: "Recipe Platform",
    detail: "Recipe library",
    description:
      "Open the recipe platform for recipe browsing, subscriber access, billing, and account management.",
    href: recipePlatformUrl,
    cta: "Open website",
    external: true,
    status: "Connected app",
  },
];
