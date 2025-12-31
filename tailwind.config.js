/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // PostAI brand colors
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // UI colors
        sidebar: '#1e1e1e',
        panel: '#252526',
        border: '#3c3c3c',
        'text-primary': '#cccccc',
        'text-secondary': '#808080',
        // Method colors
        'method-get': '#61affe',
        'method-post': '#49cc90',
        'method-put': '#fca130',
        'method-delete': '#f93e3e',
        'method-patch': '#50e3c2',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
