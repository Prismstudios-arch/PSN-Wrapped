/** @type {import('tailwindcss').Config} */
// Phase 1: minimal. Endcard's real brand palette (NOT PlayStation blue) is
// defined in Phase 2. These neutral darks just make the placeholder legible.
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0B0B12',
        surface: '#15151F',
        muted: '#8A8AA0',
      },
    },
  },
  plugins: [],
};
