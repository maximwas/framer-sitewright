// Writes the website's changelog page (docs/changelog/index.html) from CHANGELOG.md, so the release history lives in
// one file. Unreleased changes stay off the page. Run it after editing CHANGELOG.md: pnpm docs:changelog.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../../../CHANGELOG.md", import.meta.url));
const page = fileURLToPath(new URL("../../../docs/changelog/index.html", import.meta.url));
const VERSION_HEADING = /^## (\d+\.\d+\.\d+) — (\d{4}-\d{2}-\d{2})$/;

/** The released versions: version, date, and the section's Markdown lines. */
function releases(markdown) {
  const lines = markdown.replace(/<!--[\s\S]*?-->/g, "").split("\n");
  const found = [];
  let current = null;

  for (const line of lines) {
    const heading = VERSION_HEADING.exec(line);

    if (heading !== null) {
      current = { version: heading[1], date: heading[2], lines: [] };
      found.push(current);
    } else if (line.startsWith("## ")) {
      current = null;
    } else if (current !== null) {
      current.lines.push(line);
    }
  }

  return found;
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Inline Markdown: `code`, **bold** and [links](url). */
function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

/** A section's body: ### groups, bullet lists (continued by indented lines) and paragraphs. */
function body(lines) {
  const blocks = [];
  let list = null;
  let paragraph = null;
  const close = () => {
    if (list !== null) {
      blocks.push(`<ul>\n${list.map((item) => `            <li>${inline(item)}</li>`).join("\n")}\n          </ul>`);
    }

    if (paragraph !== null) {
      blocks.push(`<p>${inline(paragraph)}</p>`);
    }

    list = null;
    paragraph = null;
  };

  for (const line of lines) {
    if (line.startsWith("### ")) {
      close();

      const group = line.slice(4).trim();

      blocks.push(`<h3 class="change change-${group.toLowerCase()}">${inline(group)}</h3>`);
    } else if (line.startsWith("- ")) {
      if (paragraph !== null) {
        close();
      }

      list = [...(list ?? []), line.slice(2)];
    } else if (line.startsWith("  ") && list !== null) {
      list[list.length - 1] += ` ${line.trim()}`;
    } else if (line.trim() === "") {
      close();
    } else {
      paragraph = paragraph === null ? line.trim() : `${paragraph} ${line.trim()}`;
    }
  }

  close();

  return blocks.map((block) => `          ${block}`).join("\n");
}

function anchor(version) {
  return `v${version.replaceAll(".", "-")}`;
}

/** A date as people read it: "October 13, 2026", or "Oct 13" when short. */
function dateText(date, short = false) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: short ? "short" : "long",
    day: "numeric",
    ...(short ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}

/** The table of contents: versions grouped by their minor line (1.1, 1.0), each with its short date. */
function contents(list) {
  const lines = [];
  let minor = null;

  for (const { version, date } of list) {
    const line = version.split(".").slice(0, 2).join(".");

    if (line !== minor) {
      minor = line;
      lines.push(`            <p class="toc-title">${line}</p>`);
    }

    lines.push(
      `            <a href="#${anchor(version)}"><span>${version}</span><time datetime="${date}">${dateText(date, true)}</time></a>`,
    );
  }

  return lines.join("\n");
}

function render(list) {
  const toc = contents(list);
  const sections = list
    .map(
      ({ version, date, lines }, index) => `        <section class="release" id="${anchor(version)}">
          <div class="release-head">
            <h2>${version}</h2>
            <time datetime="${date}">${dateText(date)}</time>${index === 0 ? '\n            <span class="release-latest">Latest</span>' : ""}
          </div>
${body(lines)}
        </section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sitewright changelog</title>
    <meta name="description" content="Every release of Sitewright, the MCP server and Framer plugin: the version, the day and what changed." />
    <meta name="color-scheme" content="light dark" />
    <link rel="icon" href="../favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="../site.css" />
    <script src="changelog.js" defer></script>
  </head>
  <body class="docs-page">
    <a class="skip" href="#content">Skip to content</a>

    <header class="top">
      <div class="wrap">
        <a class="brand" href="../" aria-label="Sitewright home">
          <svg aria-hidden="true" viewBox="0 0 30 30">
            <rect x="0.5" y="0.5" width="29" height="29" rx="7.5" fill="#1c1d21" stroke="#ffffff" stroke-opacity="0.16" />
            <g transform="translate(4.2 4.2) scale(0.3375)"><path fill="#f4f2ec" d="M10 10h16v7h-9v9h-7zM54 10v16h-7v-9h-9v-7zM10 54V38h7v9h9v7zM54 54H38v-7h9v-9h7z" /><path fill="#f2a93b" d="M32 21l3.6 7.4L43 32l-7.4 3.6L32 43l-3.6-7.4L21 32l7.4-3.6z" /></g>
          </svg>
          Sitewright <span class="brand-sub">Changelog</span>
        </a>
        <nav class="links" aria-label="Sections">
          <a href="../docs/">Docs</a>
          <a href="../">Home</a>
        </nav>
        <a class="gh" href="https://github.com/maximwas/framer-sitewright">
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor">
            <path
              d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
            />
          </svg>
          GitHub
        </a>
      </div>
    </header>

    <div class="wrap docs">
      <aside class="toc" aria-label="Versions">
        <details open>
          <summary>Versions</summary>
          <nav>
${toc}
          </nav>
        </details>
      </aside>

      <main id="content" class="prose changelog">
        <section id="top">
          <p class="kicker">Changelog</p>
          <h1>What changed in each release</h1>
          <p class="lead">Every release of Sitewright, newest first: the version, the day it was released, and what changed. The npm package and the Framer plugin share one version. Update the MCP server with <code>npx -y sitewright@latest</code>; Framer updates the plugin.</p>
        </section>
        <div class="releases">
${sections}
        </div>
      </main>
    </div>

    <footer>
      <div class="wrap">
        <p>
          Sitewright is free and open source under the
          <a href="https://github.com/maximwas/framer-sitewright/blob/main/LICENSE">MIT license</a>. Unofficial: not
          affiliated with or endorsed by Framer. “Framer” is a trademark of Framer B.V.
        </p>
        <p><a href="../">Home</a> · <a href="../docs/">Docs</a> · <a href="https://github.com/maximwas/framer-sitewright">GitHub</a> · <a href="https://github.com/maximwas/framer-sitewright/issues/new/choose">Report a bug or an idea</a> · <a href="https://github.com/maximwas/framer-sitewright/discussions">Discussions</a> · <a href="https://ko-fi.com/maksymvasianin">Ko-fi</a> · <a href="https://send.monobank.ua/jar/7o9oMrbXTj">monobank</a> · <a href="../privacy/">Privacy</a> · <a href="./">Changelog</a></p>
      </div>
    </footer>
  </body>
</html>
`;
}

const list = releases(readFileSync(source, "utf8"));

if (list.length === 0) {
  throw new Error("CHANGELOG.md has no released version (## <version> — <YYYY-MM-DD>).");
}

mkdirSync(dirname(page), { recursive: true });
writeFileSync(page, render(list));
console.log(`Wrote ${list.length} releases to ${page}`);
