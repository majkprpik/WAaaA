/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: [
    "./contents/*.{js,jsx,ts,tsx}", // For components directly inside the 'contents' folder
    "./src/**/*.{js,jsx,ts,tsx}", // For components in the 'src' folder, including Shadcn components
    "./components/**/*.{js,jsx,ts,tsx}", // For components in the root 'components' folder
    "./node_modules/shadcn/**/*.{js,jsx,ts,tsx}" // Ensure this is correctly pointing to Shadcn's components if you're using them
  ],
  plugins: [require("tailwindcss-animate")]
}
