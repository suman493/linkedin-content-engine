/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        linkedin: {
          blue: '#0A66C2',
          light: '#E7F3FF',
        }
      }
    },
  },
  plugins: [],
}
