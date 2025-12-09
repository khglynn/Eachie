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
        // Blueprint/chalkboard blue palette
        paper: {
          bg: '#2563a8',      // Classic blueprint blue
          card: '#1e4f7a',    // Darker card background
          border: '#4a90c4',  // Lighter blue border
          light: '#5ba3d9',   // Accent highlights
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
