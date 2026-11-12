/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./src/**/*.{html,ts}",
    ],
    theme: {
      extend: {
        colors: {
          'cyan-accent': '#00e5ff',
          'dark-bg': '#0f172a',
          'dark-panel': '#1e293b',
        }
      },
    },
    plugins: [],
  }