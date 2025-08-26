/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
        '2xl': '3rem',
      },
    },
    extend: {
      screens: {
        'xs': '420px',
      },
      fontFamily: {
        'space': ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      fontWeight: {
        'normal': '400',
        'medium': '500',
        'semibold': '600',
        'bold': '700',
      },
      colors: {
        // Brand Colors
        brand: {
          'green-strong': '#1a5f3f', // Dark green
          'green': '#7dd3fc', // Light green/cyan
          'purple-strong': '#4c1d95', // Dark purple/indigo
          'purple-weak': '#c7d2fe', // Light purple
          // Accent gradient inspired by That Works CTA styling
          'indigo': '#667eea',
          'violet': '#764ba2',
        },
        // CRO Colors
        cro: {
          'win-strong': '#059669', // Green
          'win-weak': '#a7f3d0', // Light green
          'no-impact-strong': '#ea580c', // Orange
          'no-impact-weak': '#fed7aa', // Light orange
          'loss-strong': '#dc2626', // Red
          'loss-weak': '#fecaca', // Light red
        },
        // Brand Neutrals (grayscale)
        neutral: {
          '1000': '#000000', // Black
          '950': '#0f0f0f',
          '900': '#1a1a1a',
          '800': '#333333',
          '700': '#4d4d4d',
          '600': '#666666',
          '500': '#808080',
          '400': '#999999',
          '300': '#b3b3b3',
          '200': '#cccccc',
          '100': '#e6e6e6',
          '50': '#f3f3f3',
          '25': '#f9f9f9',
          'white': '#ffffff',
        },
        // Legacy colors for backward compatibility
        gray: {
          25: '#FCFCFD',
          50: '#F9FAFB',
          100: '#F2F4F7',
          200: '#EAECF0',
          300: '#D0D5DD',
          400: '#98A2B3',
          500: '#667085',
          600: '#475467',
          700: '#344054',
          800: '#1D2939',
          900: '#101828',
        },
        primary: {
          25: '#FCFAFF',
          50: '#F9F5FF',
          100: '#F4EBFF',
          200: '#E9D7FE',
          300: '#D6BBFB',
          400: '#B692F6',
          500: '#9E77ED',
          600: '#7F56D9',
          700: '#6941C6',
          800: '#53389E',
          900: '#42307D',
        },
        success: {
          25: '#F6FEF9',
          50: '#ECFDF3',
          100: '#D1FADF',
          200: '#A6F4C5',
          300: '#6CE9A6',
          400: '#32D583',
          500: '#12B76A',
          600: '#039855',
          700: '#027A48',
          800: '#05603A',
          900: '#054F31',
        },
      },
      boxShadow: {
        // CTA/button and card shadows used across the app
        'brand': '-1px 1px 4px rgba(0,0,0,0.26), -5px 4px 6px rgba(0,0,0,0.23), -12px 9px 9px rgba(0,0,0,0.13), -21px 16px 10px rgba(0,0,0,0.04)',
        'brand-hover': '-2px 2px 6px rgba(0,0,0,0.28), -6px 5px 8px rgba(0,0,0,0.25), -14px 11px 11px rgba(0,0,0,0.15), -25px 18px 12px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        'full': '9999px',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, var(--accent-start, #667eea) 0%, var(--accent-end, #764ba2) 100%)',
      },
      transitionTimingFunction: {
        'brand': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      animation: {
        'slide-up': 'slideUp 0.5s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
