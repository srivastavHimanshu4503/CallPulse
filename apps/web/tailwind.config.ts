import type { Config } from "tailwindcss";
import preset from "../../packages/config/tailwind.preset.js";

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [preset],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
