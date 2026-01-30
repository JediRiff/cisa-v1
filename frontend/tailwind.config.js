/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cisa-navy': '#005288',
        'cisa-red': '#d92525',
        'severity-severe': '#d92525',
        'severity-elevated': '#f59e0b',
        'severity-normal': '#16a34a',
      },
    },
  },
  plugins: [],
}
