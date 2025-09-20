import { id } from "date-fns/locale";
import dynamic from "next/dynamic";

// interface Tool {
//   title: string;
//   description: string;
//   href: string;
// }

export const TOOLS = [
  {
    id: 1,
    title: "Menu Generator",
    description: "Generate daily menus from a weekly menu document.",
    href: "/dashboard/tools/menu-generator",
  },
//   {
//     id: 2,
//     title: "Cost Generator",
//     description: "Generate daily menus from a weekly menu document.",
//     href: "/dashboard/tools/menu-generator",
//   }
];