/** The path as Framer stores it: "/Lab Site" becomes "/lab-site" (page_create shows it). */
export function storedPagePath(path: string): string {
  return path.toLowerCase().replaceAll(/\s+/g, "-");
}
