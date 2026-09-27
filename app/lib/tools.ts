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
    id: 5,
    title: "Weekly Menu Generator",
    detail: "Menu text to Word",
    description: "Paste a weekly menu, review choices and allergens, and download a formatted Word document.",
    href: "/dashboard/tools/weekly-menu-generator",
    cta: "Create weekly menu",
    status: "Ready to connect",
  },
  {
    id: 4,
    title: "Meal Library",
    detail: "Weekly menu archive",
    description:
      "Find previous meals, explore menu history and browse Henbrook's menu design rules.",
    href: "/dashboard/tools/meal-library",
    cta: "Explore meals",
    status: "Read-only",
  },
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
