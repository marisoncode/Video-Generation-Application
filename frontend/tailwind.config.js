/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1148CC",
          magenta: "#E11D5A",
          dark: "#0F172A",
          card: "#1E293B"
        }
      }
    },
  },
  plugins: [],
}

