/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#4A678F",
        moss: "#99ADC6",
        leaf: "#99ADC6",
        sand: "#FFFFFF",
        ember: "#CB693A",
        sky: "#F4F9FC"
      },
      boxShadow: {
        card: "0 18px 40px rgba(74, 103, 143, 0.08)"
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "\"Times New Roman\"", "serif"],
        body: ["\"Avenir Next\"", "Segoe UI", "sans-serif"]
      }
    }
  },
  plugins: []
};
