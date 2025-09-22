// Motion variants
 export const fadeUp = (reducedMotion: boolean | null) => ({
    hidden: { opacity: 0, y: reducedMotion ? 0 : 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.55 } },
  });

  export const stagger = (reducedMotion: boolean | null) => ({
    hidden: {},
    show: {
      transition: { staggerChildren: reducedMotion ? 0 : 0.08 },
    },
  });

  export const float = (reducedMotion: boolean) => ({
    animate: {
      y: reducedMotion ? 0 : [0, -8, 0],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
    },
  });