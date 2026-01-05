// Design Tokens voor TIMR - Light & Dark Theme
export const designTokens = {
  colors: {
    // Light Theme
    light: {
      background: {
        primary: '#ffffff',
        secondary: '#f8fafc',
        elevated: '#ffffff',
        hover: '#f1f5f9',
      },
      text: {
        primary: '#0f172a',
        secondary: '#475569',
        muted: '#94a3b8',
        inverse: '#ffffff',
      },
      border: {
        primary: '#e2e8f0',
        secondary: '#cbd5e1',
      },
      brand: {
        primary: '#3b82f6',
        hover: '#2563eb',
        light: '#dbeafe',
      },
      status: {
        success: '#10b981',
        successLight: '#d1fae5',
        warning: '#f59e0b',
        warningLight: '#fef3c7',
        error: '#ef4444',
        errorLight: '#fee2e2',
        info: '#3b82f6',
        infoLight: '#dbeafe',
      },
    },
    // Dark Theme
    dark: {
      background: {
        primary: '#0f172a',
        secondary: '#1e293b',
        elevated: '#334155',
        hover: '#475569',
      },
      text: {
        primary: '#f8fafc',
        secondary: '#cbd5e1',
        muted: '#94a3b8',
        inverse: '#0f172a',
      },
      border: {
        primary: '#334155',
        secondary: '#475569',
      },
      brand: {
        primary: '#3b82f6',
        hover: '#60a5fa',
        light: '#1e3a8a',
      },
      status: {
        success: '#10b981',
        successLight: '#064e3b',
        warning: '#f59e0b',
        warningLight: '#78350f',
        error: '#ef4444',
        errorLight: '#7f1d1d',
        info: '#3b82f6',
        infoLight: '#1e3a8a',
      },
    },
  },
  typography: {
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem',// 30px
      '4xl': '2.25rem', // 36px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.25rem',   // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '2rem',   // 32px
    '4xl': '2.5rem', // 40px
    '5xl': '3rem',   // 48px
    '6xl': '4rem',   // 64px
  },
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
  transitions: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    base: '300ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '500ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

export type Theme = 'light' | 'dark';
