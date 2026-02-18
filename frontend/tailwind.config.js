/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cisa-navy': '#005288',
        'cisa-navy-dark': '#003d66',
        'cisa-navy-light': '#0066a8',
        'cisa-navy-darker': '#002d4d',
        'cisa-red': '#d92525',
        'cisa-gold': '#d4af37',
        'cisa-gold-light': '#e6c555',
        'cisa-light': '#f0f7ff',
        'cisa-white-muted': '#e8f4fc',
        'severity-severe': '#d92525',
        'severity-elevated': '#f59e0b',
        'severity-normal': '#16a34a',
      },
      fontFamily: {
        'heading': ['Merriweather', 'Georgia', 'Times New Roman', 'serif'],
        'body': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 82, 136, 0.1)',
        'card-hover': '0 8px 30px rgba(0, 82, 136, 0.15)',
        'card-premium': '0 10px 40px rgba(0, 82, 136, 0.12)',
        'card-premium-hover': '0 20px 60px rgba(0, 82, 136, 0.18)',
        'hero': '0 25px 80px rgba(0, 82, 136, 0.2)',
        'glow-red': '0 0 40px rgba(217, 37, 37, 0.3)',
        'glow-amber': '0 0 40px rgba(245, 158, 11, 0.3)',
        'glow-green': '0 0 40px rgba(22, 163, 74, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(217, 37, 37, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(217, 37, 37, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}
