/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        accent: 'var(--color-accent)',
        highlight: 'var(--color-highlight)',
        success: 'var(--color-success)',
        'text-primary': 'var(--color-text-primary)',
        'text-muted': 'var(--color-text-muted)',
        'family-consistency': 'var(--color-family-consistency)',
        'family-recovery': 'var(--color-family-recovery)',
        'family-preparation': 'var(--color-family-preparation)',
        'family-reflection': 'var(--color-family-reflection)',
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        elevated: '0 8px 16px -6px rgba(0,0,0,0.4)',
        card: '0 4px 12px -4px rgba(0,0,0,0.3)',
      },
      keyframes: {
        'press-bounce': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.96)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
      animation: {
        'press-bounce': 'press-bounce 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-soft': 'pulse-soft 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
