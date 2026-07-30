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
        paper: {
          DEFAULT: "#0B0A09",   // Midnight inkwell dark base
          card: "#121110",      // Bound leather panel surface
          darker: "#0E0D0C",    // Recessed parchment container
          border: "#24201E",    // Bronze line border
          highlight: "#1A1817", // Subtle focus row
        },
        ink: {
          DEFAULT: "#F4F1EA",  // Warm ivory typeface
          muted: "#9E968C",    // Faded manuscript gold-pencil
          faded: "#6E675E",    // Dusty margin notes
          light: "#4E4840",    // Shadowed lettering
        },
        crimson: {
          DEFAULT: "#E05A67", // Wax seal red (alert/conflict)
          hover: "#F06B78",
          light: "#241315",
          border: "#4E2125",
        },
        gold: {
          DEFAULT: "#D4AF37", // Metallic gold leaf (threads/details)
          hover: "#E5C158",
          light: "#211D13",
          border: "#4A3E20",
        },
        sage: {
          DEFAULT: "#6B9B7E", // Emerald leather binding (resolved)
          hover: "#7EAE92",
          light: "#141C18",
          border: "#203B2C",
        },
        velvet: {
          DEFAULT: "#B386B8", // Purple velvet spine (Chekhov's guns)
          light: "#1F1521",
          border: "#3F2642",
        },
      },
      boxShadow: {
        'book': '0 4px 24px -2px rgba(0, 0, 0, 0.5), 0 2px 10px -1px rgba(0, 0, 0, 0.3)',
        'book-lg': '0 16px 40px -4px rgba(0, 0, 0, 0.7), 0 6px 20px -2px rgba(0, 0, 0, 0.5)',
        'gold-seal': '0 0 15px rgba(212, 175, 55, 0.15)',
        'wax-seal': '0 0 15px rgba(224, 90, 103, 0.15)',
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
          "0%, 100%": { opacity: "0.4", boxShadow: "0 0 15px rgba(212, 175, 55, 0.15)" },
          "50%": { opacity: "0.85", boxShadow: "0 0 25px rgba(212, 175, 55, 0.35)" },
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
