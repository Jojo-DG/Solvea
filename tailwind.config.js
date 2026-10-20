/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { 900: '#0B241B', 800: '#12372A', 700: '#1B4A37', 600: '#246043' },
        energy: { DEFAULT: '#2F7D4A', 400: '#3E995B' },
        solar: { DEFAULT: '#D9A441', 400: '#E4B45C', 600: '#B9892F' },
        carbon: '#101413',
        paper: { DEFAULT: '#F5F6F2', dark: '#E7EAE2' },
        muted: '#68716C',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(11,36,27,0.06), 0 2px 8px rgba(11,36,27,0.06)' },
    },
  },
  plugins: [],
}
