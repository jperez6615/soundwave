/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0a0f',
          1: '#111118',
          2: '#18181f',
          3: '#22222c',
          4: '#2a2a36',
        },
        accent: {
          DEFAULT: '#7c6af7',
          dim: '#5a4fd6',
          bright: '#9d8fff',
          glow: 'rgba(124, 106, 247, 0.3)',
        },
        pink: {
          accent: '#f06292',
        },
        text: {
          primary: '#f0eeff',
          secondary: '#8b89a8',
          muted: '#4a485e',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'equalizer': 'equalizer 1.2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        equalizer: {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(ellipse at top left, rgba(124, 106, 247, 0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(240, 98, 146, 0.1) 0%, transparent 50%)',
      },
    },
  },
  plugins: [],
};
