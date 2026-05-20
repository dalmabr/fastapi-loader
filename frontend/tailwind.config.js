/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'Inter', 'sans-serif'],
        geist: ['var(--font-geist-sans)', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}