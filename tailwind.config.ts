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
      },
      fontFamily: {
        heading: ['var(--font-sohne-breit)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;