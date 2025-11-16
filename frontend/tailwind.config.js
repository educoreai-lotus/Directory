/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-blue': '#065f46',
        'primary-purple': '#047857',
        'primary-cyan': '#0f766e',
        'accent-gold': '#d97706',
        'accent-green': '#047857',
        'accent-orange': '#f59e0b',
        'bg-primary': '#f8fafc',
        'bg-secondary': '#e2e8f0',
        'bg-tertiary': '#cbd5e1',
        'bg-card': '#ffffff',
        'text-primary': '#1e293b',
        'text-secondary': '#475569',
        'text-muted': '#64748b',
        'text-accent': '#334155',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #065f46, #047857)',
        'gradient-secondary': 'linear-gradient(135deg, #0f766e, #047857)',
        'gradient-accent': 'linear-gradient(135deg, #d97706, #f59e0b)',
        'gradient-card': 'linear-gradient(145deg, #ffffff, #f0fdfa)',
      },
      boxShadow: {
        'glow': '0 0 30px rgba(6, 95, 70, 0.3)',
        'card': '0 10px 40px rgba(0, 0, 0, 0.1)',
        'hover': '0 20px 60px rgba(6, 95, 70, 0.2)',
      },
      spacing: {
        'xs': '0.5rem',
        'sm': '1rem',
        'md': '1.5rem',
        'lg': '2rem',
        'xl': '3rem',
        '2xl': '4rem',
      },
    },
  },
  plugins: [],
}

