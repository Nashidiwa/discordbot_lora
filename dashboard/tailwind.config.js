/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        discord: {
          blurple: '#5865F2',
          green: '#57F287',
          yellow: '#FEE75C',
          red: '#ED4245',
          darkest: '#1e1f22',
          darker: '#2b2d31',
          dark: '#313338',
          card: '#2b2d31',
          border: '#3f4147',
          text: '#f2f3f5',
          muted: '#949ba4',
        },
      },
    },
  },
  plugins: [],
};
