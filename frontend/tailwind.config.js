/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          500: '#486581',
          600: '#334e68',
          700: '#243b53',
          800: '#102a43',
        },
      },
    },
  },
  plugins: [],
};
