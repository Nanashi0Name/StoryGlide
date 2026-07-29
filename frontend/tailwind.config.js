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
          DEFAULT: "#FAF7F0", // Creamy book page background
          card: "#FFFFFF",    // Clean white paper sheet
          darker: "#F2ECE0",  // Shaded parchment for panels
          border: "#E4DCD0",  // Fine vintage binding line
          highlight: "#F5F0E6",
        },
        ink: {
          DEFAULT: "#1F1E1C",  // Iron gall ink (nearly black)
          muted: "#5A544F",    // Faded manuscript ink
          faded: "#8E8880",    // Lead pencil marking
          light: "#B8B2A9",
        },
        crimson: {
          DEFAULT: "#8B2635", // Wax seal red (priority issues/conflicts)
          hover: "#721F2B",
          light: "#FDF1F2",
          border: "#F7D6D9",
        },
        gold: {
          DEFAULT: "#B38F4D", // Antique gold leafing
          hover: "#9C7B40",
          light: "#FDF8F0",
          border: "#F5E6CC",
        },
        sage: {
          DEFAULT: "#4B6B58", // Leather green binding (resolved status)
          hover: "#3D5848",
          light: "#F1F5F2",
          border: "#D9E3DC",
        },
        velvet: {
          DEFAULT: "#5C3A5A", // Purple velvet spine
          light: "#F8F4F9",
          border: "#EADEE9",
        },
      },
      boxShadow: {
        'book': '0 4px 20px -2px rgba(42, 35, 25, 0.08), 0 2px 8px -1px rgba(42, 35, 25, 0.04)',
        'book-lg': '0 12px 35px -4px rgba(42, 35, 25, 0.12), 0 4px 16px -2px rgba(42, 35, 25, 0.06)',
        'gold-seal': '0 0 15px rgba(179, 143, 77, 0.2)',
        'wax-seal': '0 0 15px rgba(139, 38, 53, 0.2)',
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
