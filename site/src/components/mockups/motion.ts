// enter and leave curves measured from the Activepieces menus, and the swap used when content changes in place
export const ENTER = [0.16, 1, 0.3, 1] as const;
export const LEAVE = [0.4, 0, 0.9, 0.4] as const;
export const SWAP = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.26, ease: ENTER },
};
export const POP = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.36, ease: ENTER } },
  exit: { opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.2, ease: LEAVE } },
};

// the qualities the app lists for a 4K video, in its own words
export const QUALITIES = ['Best available', '4K (2160p)', '2K (1440p)', '1080p Full HD', '720p HD', '480p SD', '360p'] as const;
