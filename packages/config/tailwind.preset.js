/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366F1',
          foreground: '#FFFFFF',
        },
        background: {
          dark: '#0F0F0F',
          light: '#FFFFFF',
        },
        surface: {
          dark: '#1A1A1A',
          light: '#F9FAFB',
        },
        border: {
          dark: '#2A2A2A',
          light: '#E5E7EB',
        },
        text: {
          dark: '#F9FAFB',
          light: '#111827',
        },
        muted: '#6B7280',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.5rem',
      },
      spacing: {
        sidebar: '240px',
      },
    },
  },
  plugins: [],
};
