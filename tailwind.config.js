/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        earth: {
          50: '#faf7f2',
          100: '#f3eadf',
          200: '#e7d6c2',
          300: '#d7bc9d',
          400: '#bd916b',
          500: '#9b704f',
          600: '#7f573d',
          700: '#654434',
          800: '#4b352b',
          900: '#2f241f',
        },
        moss: {
          50: '#f2f7f2',
          100: '#dfece0',
          500: '#58755c',
          700: '#344b39',
          900: '#1e2d23',
        },
        clay: {
          100: '#f4dfd1',
          400: '#c47b59',
          600: '#94523a',
        },
      },
      boxShadow: {
        soft: '0 14px 40px rgba(48, 36, 31, 0.08)',
      },
    },
  },
  plugins: [],
};
