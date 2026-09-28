import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Replaced __dirname with import.meta.dirname to clear the Vite 8 warning
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});