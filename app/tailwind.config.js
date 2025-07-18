/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        background: {
          DEFAULT: '#111827',
          light: '#1F2937',
          lighter: '#374151',
        },
        text: {
          DEFAULT: '#F3F4F6',
          muted: '#D1D5DB',
        }
      },
    },
  },
  plugins: [],
} 