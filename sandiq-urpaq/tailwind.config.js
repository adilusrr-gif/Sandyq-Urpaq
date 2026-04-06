/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-unbounded)', 'sans-serif'],
        body: ['var(--font-cormorant)', 'serif'],
        mono: ['var(--font-jetbrains)', 'monospace'],
      },
      colors: {
        ink: '#0C0A06',
        parchment: { DEFAULT: '#F5EDD8', 2: '#EDE0C4' },
        gold: { DEFAULT: '#C8972A', 2: '#E8B84B', 3: '#F5D080' },
        rust: '#8B3A1E',
        sage: '#4A6741',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in': 'fadeIn 0.4s ease both',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pulseGold: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(200,151,42,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(200,151,42,0)' },
        },
      },
    },
  },
  plugins: [],
}
