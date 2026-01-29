import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chartreuse: {
          50: '#F7FFE6',
          100: '#EFFFCC',
          500: '#A8B475',
          600: '#8A9660',
          700: '#6C784B',
          DEFAULT: '#A8B475',
        },
        camel: {
          50: '#F5F0E8',
          100: '#EBE1D1',
          500: '#B8876B',
          600: '#9A6F57',
          700: '#7C5744',
          DEFAULT: '#B8876B',
        },
        steel: {
          50: '#E8F1F7',
          100: '#D1E3EF',
          500: '#7D96AC',
          600: '#677E91',
          700: '#516676',
          DEFAULT: '#7D96AC',
        },
        rose: {
          50: '#F9F2EE',
          100: '#F3E5DD',
          500: '#A97B8F',
          600: '#8E6577',
          700: '#73505F',
          DEFAULT: '#A97B8F',
        },
        // Additional semantic colors for the design system
        muko: {
          olive: '#43432B',
          burgundy: '#4D302F',
          cream: {
            DEFAULT: '#E6E3D6',
            light: '#FAFAF8',
          },
        },
      },
      fontFamily: {
        heading: ['var(--font-sohne-breit)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        // Aliases for convenience
        sohne: ['var(--font-sohne-breit)', 'system-ui', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      // Add gradient utilities
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      // Add custom shadows with Muko's olive tone
      boxShadow: {
        'muko-sm': '0 2px 8px rgba(67, 67, 43, 0.04), 0 1px 2px rgba(67, 67, 43, 0.06)',
        'muko-md': '0 4px 16px rgba(67, 67, 43, 0.06), 0 2px 4px rgba(67, 67, 43, 0.04)',
        'muko-lg': '0 8px 32px rgba(67, 67, 43, 0.08), 0 4px 8px rgba(67, 67, 43, 0.04)',
        'muko-xl': '0 20px 60px rgba(67, 67, 43, 0.08), 0 8px 24px rgba(67, 67, 43, 0.06)',
      },
      // Add extra backdrop blur option
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
} satisfies Config;