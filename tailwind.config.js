/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Deep cyanotype/Prussian blue palette
        paper: {
          bg: '#0c4271',      // Deep cyanotype blue
          card: '#0a3558',    // Darker card background
          border: '#1a5a8a',  // Lighter blue border
          light: '#2d7ab8',   // Accent highlights
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
