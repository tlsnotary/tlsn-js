/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', '@/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      screens: {
        clg: '1180px',
      },
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        blue: {
          50: '#e9f4ff',
          100: '#d6ebff',
          200: '#b6d7ff',
          300: '#8abbff',
          400: '#5c8fff',
          500: '#3665ff',
          600: '#1436ff',
          700: '#0b2bf8',
          800: '#0c28c7',
          900: '#142b9b',
          950: '#0c175a',
        },
      },
      keyframes: {
        progress: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      animation: {
        progress: 'progress 4s linear forwards',
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            h1: {
              // fontWeight: '400', // Regular weight
              marginBottom: '0.4em',
            },
            h2: {
              // fontWeight: '400',
              marginBottom: '0.4em',
            },
            h3: {
              // fontWeight: '400',
              marginBottom: '0.4em',
            },
            p: {
              color: 'inherit',
            },
            // You can also adjust other properties like:
            // fontSize, lineHeight, color, etc.
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
