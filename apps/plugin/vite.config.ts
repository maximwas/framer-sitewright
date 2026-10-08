import { framerCss } from "@sitewright/ui/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import framer from "vite-plugin-framer";
import mkcert from "vite-plugin-mkcert";

// The plugin reaches the MCP server through the local app's window (http://127.0.0.1:18710), not through this server.
export default defineConfig({
  plugins: [react(), tailwindcss(), framerCss(), mkcert(), framer()],
  server: {
    // Framer opens development plugins at https://localhost:5173, and the bridge window relays for that origin.
    port: 5173,
    strictPort: true,
  },
  // Framer's Marketplace review reads the submitted code: every source module ships as its own readable file, at its
  // source path (apps/plugin/src/…, packages/core/src/…), not packed into one bundle, and nothing is minified.
  // vite-plugin-framer keeps the `.mjs` names Framer needs. The only network code was Vite's modulepreload polyfill,
  // which Framer's browsers do not need.
  build: {
    minify: false,
    cssMinify: false,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        preserveModules: true,
      },
    },
  },
});
