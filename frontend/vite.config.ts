import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Dana OS",
        short_name: "Dana OS",
        description: "Personal life management and tracking",
        theme_color: "#aa3bff",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      // Use process.cwd() instead of __dirname so the alias resolves correctly
      // both on the host and inside Docker (where VirtioFS realpathSync can
      // return the host path instead of the container /app path).
      "@": path.resolve(process.cwd(), "./src"),
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle Highcharts and its modules together so CJS
    // interop resolves correctly and the module init functions are callable.
    include: ["highcharts", "highcharts/modules/heatmap", "highcharts-react-official"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
