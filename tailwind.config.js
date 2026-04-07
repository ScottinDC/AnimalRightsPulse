/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10221c",
        moss: "#234338",
        leaf: "#4f7a55",
        sand: "#f4efdf",
        ember: "#c45d37",
        sky: "#b5d9df"
      },
      boxShadow: {
        card: "0 18px 40px rgba(16, 34, 28, 0.08)"
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "\"Times New Roman\"", "serif"],
        body: ["\"Avenir Next\"", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
