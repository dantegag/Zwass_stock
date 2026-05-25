/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f0e0d',
        surface: '#1a1917',
        card: '#242220',
        accent: '#c9a96e',
        'accent-dark': '#a8863f',
        cream: '#f5f0e8',
        muted: '#8a8278',
        success: '#4a9e6b',
        warning: '#c9893a',
        danger: '#b54545',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
