/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          'light-bg': '#f5f5f7',
          'light-elevated': '#ffffff',
          'light-label': 'rgba(60, 60, 67, 0.6)',
          'light-separator': 'rgba(60, 60, 67, 0.29)',
          
          'dark-bg': '#000000',
          'dark-elevated': '#1c1c1e',
          'dark-label': 'rgba(235, 235, 245, 0.6)',
          'dark-separator': 'rgba(84, 84, 88, 0.65)',

          'blue': '#0a84ff',
          'black': '#000000',
          'white': '#ffffff',
        }
      },
      animation: {
        'subtle-fade-in': 'subtle-fade-in 1s ease-out',
        'subtle-slide-up': 'subtle-slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'subtle-fade-in': {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        'subtle-slide-up': {
          from: { transform: 'translateY(20px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        }
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
      },
      boxShadow: {
        'soft-light': '0px 8px 40px rgba(0, 0, 0, 0.05)',
        'soft-dark': '0px 8px 40px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}
