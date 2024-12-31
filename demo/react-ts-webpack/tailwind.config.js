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
        green: {
          50: '#ecfce9',
          100: '#d6f8cf',
          200: '#aef2a4',
          300: '#7de76f',
          400: '#53d843',
          500: '#2eb022',
          600: '#219719',
          700: '#1d7318',
          800: '#1b5c18',
          900: '#1a4e19',
          950: '#082b08',
        },
        red: {
          50: '#fff1f1',
          100: '#ffdfdf',
          200: '#ffc4c4',
          300: '#ff9b9b',
          400: '#ff6262',
          500: '#ff3131',
          600: '#f01212',
          700: '#cb0a0a',
          800: '#b50e0e',
          900: '#8a1212',
          950: '#4c0303',
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
