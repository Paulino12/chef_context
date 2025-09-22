/**
 * Centralized UI tokens & helpers so we stay DRY.
 * If you want to tweak widths/gutters, do it here once.
 */
export const LAYOUT = {
  // Sidebar width at ≥ md (rem is Tailwind’s base; 16rem = 256px)
  SIDEBAR_W: "16rem",

  // Page content max-widths at different breakpoints
  CONTENT_MAX_W: "max-w-[36rem] lg:max-w-[64rem] py-8",

  // Horizontal padding for pages (scales by breakpoint)
  PAGE_X: "px-4 md:px-6",

  // Vertical padding for headers / sections
  HEADER_Y: "py-3",
  SECTION_GAP: "space-y-5",
};
