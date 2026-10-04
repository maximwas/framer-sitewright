import type { Plugin } from "vite";
import { FRAMER_FONT_IMPORT } from "../constants/build.ts";

/**
 * framer.css loads Inter with `@import url("./inter.css")`. Tailwind keeps url() imports as they are, and the build
 * moves this one to the top of the bundle, where it points at a file that is not there (a 404 in the browser). The
 * apps import inter.css themselves, at the top of their styles.css, so the import is dropped from Tailwind's output.
 * List it after tailwindcss(): both run before Vite's own CSS handling, in the order given.
 */
export function framerCss(): Plugin {
  return {
    name: "sitewright:framer-css",
    enforce: "pre",
    transform(code, id) {
      if (!id.split("?")[0]?.endsWith(".css") || !code.includes("inter.css")) {
        return null;
      }

      return {
        code: code.replace(FRAMER_FONT_IMPORT, ""),
        map: null,
      };
    },
  };
}
