/** @type {import('tailwindcss').Config} */
const withOpacity = (varName) => `rgb(var(${varName}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: withOpacity('--color-bg'),
        surface: withOpacity('--color-surface'),
        'surface-elevated': withOpacity('--color-surface-elevated'),
        accent: withOpacity('--color-accent'),
        highlight: withOpacity('--color-highlight'),
        success: withOpacity('--color-success'),
        warning: withOpacity('--color-warning'),
        'text-primary': withOpacity('--color-text-primary'),
        'text-muted': withOpacity('--color-text-muted'),
        'family-consistency': withOpacity('--color-family-consistency'),
        'family-recovery': withOpacity('--color-family-recovery'),
        'family-preparation': withOpacity('--color-family-preparation'),
        'family-reflection': withOpacity('--color-family-reflection'),
        'border-subtle': 'rgb(var(--color-border-subtle) / 0.08)',
        'border-strong': 'rgb(var(--color-border-strong) / 0.16)',
      },
      borderColor: {
        DEFAULT: 'rgb(var(--color-border-subtle) / 0.08)',
        subtle: 'rgb(var(--color-border-subtle) / 0.08)',
        strong: 'rgb(var(--color-border-strong) / 0.16)',
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
