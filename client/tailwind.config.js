/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#16202E', soft: '#4A5769', faint: '#8A94A6' },
        paper: { DEFAULT: '#F6F7FB', raised: '#FFFFFF', sunken: '#ECEFF6' },
        exam: { DEFAULT: '#2A4BA0', dark: '#1E3778', light: '#E8EDF9' },
        marigold: { DEFAULT: '#E8A33D', light: '#FDF3E2' },
        verdict: {
          right: '#17845A',
          rightLight: '#E3F3EC',
          wrong: '#C0392F',
          wrongLight: '#FBE9E7',
        },
        line: '#DDE2EC',
      },
      fontFamily: {
        display: ['Sora', 'system-ui', 'sans-serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22, 32, 46, 0.06), 0 8px 24px -16px rgba(22, 32, 46, 0.3)',
        lift: '0 12px 32px -12px rgba(30, 55, 120, 0.35)',
      },
      borderRadius: { xl2: '14px' },
    },
  },
  plugins: [],
};
