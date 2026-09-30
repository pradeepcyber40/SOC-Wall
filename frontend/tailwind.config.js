/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        soc: {
          bg: '#080c14',
          panel: '#0d1321',
          panelHeader: '#11192c',
          panelBorder: '#1c2842',
          panelBorderHover: '#2d3f66',
          muted: '#8091a7',
          highlight: '#1e293b',
          accent: '#00d2ff',
          accentGlow: 'rgba(0, 210, 255, 0.15)',
        },
        cyber: {
          critical: '#ff2a55',
          high: '#ff7700',
          medium: '#ffb703',
          low: '#00d2ff',
          info: '#38bdf8',
          online: '#10b981',
          offline: '#64748b',
          warning: '#f59e0b',
          unknown: '#a855f7',
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(0, 210, 255, 0.25)',
        'glow-red': '0 0 15px -3px rgba(255, 42, 85, 0.3)',
        'glow-green': '0 0 15px -3px rgba(16, 185, 129, 0.25)',
        'soc-panel': '0 4px 20px -2px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(28, 40, 66, 0.8)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      }
    },
  },
  plugins: [],
}
