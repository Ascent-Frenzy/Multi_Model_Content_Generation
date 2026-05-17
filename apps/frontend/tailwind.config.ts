import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'canvas-black': '#131313',
        'jelly-mint': '#3cffd0',
        'ultraviolet': '#5200ff',
        'surface-slate': '#2d2d2d',
        'secondary-text': '#949494',
        'muted-text': '#e9e9e9',
        'deep-link-blue': '#3860be',
        'console-mint': '#309875',
        'purple-rule': '#3d00bf',
        'hazard-yellow': '#EAB308',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'Helvetica Neue', 'sans-serif'],
        sans: ['var(--font-sans)', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['var(--font-mono)', 'Courier New', 'monospace'],
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '20px',
        xl: '24px',
        '2xl': '30px',
        '3xl': '40px',
      },
    },
  },
  plugins: [],
};
export default config;
