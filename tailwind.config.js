/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        church: {
          50: '#f5f7fa',
          100: '#eaeef4',
          200: '#d0dbe7',
          300: '#a7bdd4',
          400: '#779bbc',
          500: '#547ea3',
          600: '#416587',
          700: '#35526e',
          800: '#2f455c',
          900: '#1e2b3a',
          950: '#121b25',
        },
        faith: {
          emerald: '#10b981',
          gold: '#f59e0b',
          crimson: '#ef4444',
          royal: '#6366f1',
          teal: '#14b8a6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
