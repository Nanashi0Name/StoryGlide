/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "sans-serif"],
        serif: ["var(--font-fraunces)", "serif"],
        display: ["var(--font-cinzel)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        obsidian: {
          DEFAULT: "#070a13",
          card: "rgba(13, 18, 30, 0.75)",
          border: "rgba(255, 255, 255, 0.07)",
          highlight: "rgba(255, 255, 255, 0.15)",
        },
        neon: {
          cyan: "#0df0ff",
          green: "#05f3ad",
          amber: "#ffad33",
          rose: "#ff4b72",
          purple: "#bd5eff",
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(13, 240, 255, 0.25)',
        'glow-cyan-lg': '0 0 25px rgba(13, 240, 255, 0.4)',
        'glow-amber': '0 0 15px rgba(255, 173, 51, 0.25)',
        'glow-rose': '0 0 15px rgba(255, 75, 114, 0.25)',
      },
      animation: {
        "fade-in-up": "fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-in": "fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "scale-in": "scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "radar-pulse": "radarPulse 2s cubic-bezier(0, 0, 0.2, 1) infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4", boxShadow: "0 0 15px rgba(13, 240, 255, 0.15)" },
          "50%": { opacity: "0.85", boxShadow: "0 0 25px rgba(13, 240, 255, 0.35)" },
        },
        radarPulse: {
          "0%": { transform: "scale(0.95)", opacity: "0.5" },
          "50%": { opacity: "0.2" },
          "100%": { transform: "scale(1.2)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
