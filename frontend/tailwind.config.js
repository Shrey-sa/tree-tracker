/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        earth: {
          50: '#fdf8f0',
          100: '#faebd7',
          200: '#f5d5aa',
          300: '#eab882',
          400: '#dd9550',
          500: '#c97b2f',
          600: '#a85f22',
          700: '#87481c',
          800: '#6b3818',
          900: '#572e16',
        }
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
