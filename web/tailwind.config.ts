import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      screens: {
        xs: "420px",
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"DM Sans"', "sans-serif"],
        heading: ['"Fraunces"', "Georgia", "serif"],
        serif: ['"Fraunces"', '"Playfair Display"', "Georgia", "serif"]
      },
      colors: {
        canvas: "#FAF6F0",
        charcoal: "#2D1807",
        muted: "#5C4D43",
        brand: {
          orange: "#E65A15",
          "orange-dark": "#D14A0A",
          brown: "#2D1807",
          sand: "#FAF6F0",
          cream: "#F4EDE2",
          card: "#FBF8F3",
        }
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        "float-delayed": "float-delayed 10s ease-in-out infinite",
        breathe: "breathe 4s ease-in-out infinite",
        "pulse-fast": "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        marquee: "marquee 40s linear infinite",
        "marquee-reverse": "marquee-reverse 40s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-15px) rotate(2deg)" }
        },
        "float-delayed": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-10px) rotate(-2deg)" }
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.02)" }
        },
        marquee: {
          "0%": { transform: "translateY(0%)" },
          "100%": { transform: "translateY(-50%)" },
        },
        "marquee-reverse": {
          "0%": { transform: "translateY(-50%)" },
          "100%": { transform: "translateY(0%)" },
        }
      }
    }
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light"],
    darkTheme: "light",
    base: false,
    styled: true,
    utils: true,
    prefix: "",
  }
};

export default config;
