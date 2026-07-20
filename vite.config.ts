import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss() // <-- Integrates Tailwind v4 seamlessly into compilation
  ],
  server: {
    proxy: {
      // Clean pipeline path redirect for your backend serverless api routing locally
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});