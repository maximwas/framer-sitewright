import { framerCss } from "@sitewright/ui/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The MCP server serves dist/ itself (activity_open), with a strict CSP: no inline scripts, so keep modules external.
export default defineConfig({
  plugins: [react(), tailwindcss(), framerCss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: { polyfill: false },
  },
});
