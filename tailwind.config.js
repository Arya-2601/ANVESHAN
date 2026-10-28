/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'navy-900': 'var(--navy-900)',
        'blue-600': 'var(--blue-600)',
        'blue-100': 'var(--blue-100)',
        'blue-50': 'var(--blue-50)',
        'surface': 'var(--surface)',
        'border-token': 'var(--border)',
        'text-token': 'var(--text)',
        'text-muted': 'var(--text-muted)',
        'alert-700': 'var(--alert-700)',
        'alert-600': 'var(--alert-600)',
        'alert-100': 'var(--alert-100)',
        'alert-border': 'var(--alert-border)',
        'warn-700': 'var(--warn-700)',
        'warn-border': 'var(--warn-border)',
        'warn-100': 'var(--warn-100)',
        'amber-pill': 'var(--amber-pill)',
        'ok-700': 'var(--ok-700)',
        'ok-border': 'var(--ok-border)',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'inner': '8px',
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(20, 58, 107, 0.08)',
        'card': '0 1px 3px rgba(20, 58, 107, 0.08)',
        'float': '0 4px 14px rgba(20, 58, 107, 0.1)',
      }
    },
  },
  plugins: [],
}
