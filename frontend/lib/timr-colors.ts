// timr. Brand Colors - Centralized color palette
// Use these utilities throughout the app for consistent branding

export const timrColors = {
  // Primary brand colors
  orange: {
    bg: 'bg-timr-orange',
    bgHover: 'hover:bg-timr-orange-hover',
    bgDark: 'dark:bg-timr-orange',
    text: 'text-timr-orange',
    border: 'border-timr-orange',
  },
  blue: {
    bg: 'bg-timr-blue',
    bgHover: 'hover:bg-timr-blue-hover',
    bgDark: 'dark:bg-timr-blue',
    text: 'text-timr-blue',
    border: 'border-timr-blue',
  },
  yellow: {
    bg: 'bg-timr-yellow',
    bgHover: 'hover:bg-timr-yellow-hover',
    bgDark: 'dark:bg-timr-yellow',
    text: 'text-timr-yellow',
    border: 'border-timr-yellow',
  },
};

// Helper to get primary button classes with timr. orange
export const getTimrButtonClass = (base: string = '') => {
  return `bg-timr-orange hover:bg-timr-orange-hover text-white ${base}`;
};

// Helper to get secondary button classes with timr. blue
export const getTimrSecondaryButtonClass = (base: string = '') => {
  return `bg-timr-blue hover:bg-timr-blue-hover text-white ${base}`;
};

// Helper for active/selected states with timr. orange
export const getTimrActiveClass = (base: string = '') => {
  return `bg-timr-orange text-white ${base}`;
};
