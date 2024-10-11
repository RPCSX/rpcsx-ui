/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,ts,svelte}"],
  theme: {
    extend: {
      gridTemplateColumns: {
        // Hardcoded width must match the GameGridItem!
        'auto-repeat': 'repeat(auto-fill, 9rem)'
      }
    },
  },
  plugins: [],
}

