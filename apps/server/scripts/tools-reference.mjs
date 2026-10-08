// Writes the tool reference of the docs page (docs/docs/index.html) from the built server's tools/list, so the page
// shows the tools exactly as an agent sees them. Run after a build: `pnpm docs:tools`.
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const entry = fileURLToPath(new URL("../dist/bin.mjs", import.meta.url));
const page = fileURLToPath(new URL("../../../docs/docs/index.html", import.meta.url));
const START = "<!-- tools:start -->";
const END = "<!-- tools:end -->";

/** The reference's sections, in order; every tool the server lists must be in exactly one. */
const GROUPS = [
  {
    id: "project",
    title: "Project and connection",
    intro: "Where the agent starts: which project is open, how it is reached, and publishing when you ask.",
    tools: [
      "framer_status",
      "framer_connect",
      "project_overview",
      "selection_get",
      "selection_wait",
      "nodes_select",
      "node_show",
      "nodes_zoom",
      "framer_user",
      "plugin_data_get",
      "plugin_data_set",
      "publish_status",
      "deployments_list",
      "publish_preview",
      "project_publish",
    ],
  },
  {
    id: "design-system",
    title: "Design system",
    intro: "Color tokens with light and dark values, and text styles with their sizes per breakpoint.",
    tools: [
      "color_tokens_list",
      "color_tokens_upsert",
      "color_tokens_delete",
      "color_token_swap",
      "text_styles_list",
      "text_styles_upsert",
      "text_styles_delete",
      "link_styles_list",
      "link_styles_upsert",
      "link_styles_delete",
      "styles_usage",
      "fonts_search",
      "fonts_used",
    ],
  },
  {
    id: "pages",
    title: "Pages, layout and redirects",
    intro:
      "Create, duplicate and delete pages, read one as XML, find layers and replace text across pages, read and set the site's and pages' titles, descriptions, images and search settings, change pages and their motion, check what looks broken, adapt them to tablet and phone, look at them and at a reference, and redirect old paths.",
    tools: [
      "page_create",
      "page_delete",
      "page_duplicate",
      "nodes_read",
      "nodes_find",
      "nodes_query",
      "styles_copy",
      "node_clone",
      "design_apply",
      "effects_set",
      "text_replace",
      "site_settings_get",
      "site_settings_set",
      "layout_audit",
      "breakpoints_add",
      "breakpoints_suggest",
      "node_screenshot",
      "reference_screenshot",
      "redirects_list",
      "redirects_set",
    ],
  },
  {
    id: "checks",
    title: "Checks before handover",
    intro:
      "What looks fine in the editor and still fails on the published site: search titles and descriptions, broken links and anchors, the same photo twice, missing alt text, text that does not stand out from its background, copy left over from a template, and the published site itself.",
    tools: [
      "site_audit",
      "seo_audit",
      "links_check",
      "images_check",
      "a11y_audit",
      "rich_text_audit",
      "performance_audit",
      "contrast_check",
      "template_audit",
      "live_check",
    ],
  },
  {
    id: "assets",
    title: "Components and assets",
    intro:
      "Components and their controls, components from the Marketplace, icon sets, shaders, your own images, files and SVG.",
    tools: [
      "components_read",
      "component_insert",
      "component_controls_set",
      "component_make_local",
      "component_detach",
      "component_instances",
      "marketplace_item",
      "icons_search",
      "shaders_read",
      "image_upload",
      "file_upload",
      "svg_add",
    ],
  },
  {
    id: "cms",
    title: "CMS",
    intro:
      "Collections and their fields; items by slug, with values by field name. Undo covers items, not yet collections, fields or the order of items.",
    tools: [
      "cms_collections_list",
      "cms_collection_create",
      "cms_collection_delete",
      "cms_fields_set",
      "cms_items_list",
      "cms_items_upsert",
      "cms_items_delete",
      "cms_items_order",
      "cms_seo_collection",
      "cms_interlink",
      "blog_add",
    ],
  },
  {
    id: "localization",
    title: "Localization",
    intro: "New locales, what still needs translating, and the translations, one locale at a time.",
    tools: ["locales_list", "localization_get", "localization_set", "locale_add"],
  },
  {
    id: "code",
    title: "Code (opt-in)",
    intro:
      "Custom HTML and code components. The agent uses them only when you ask for code or the canvas cannot do the task, and the writes work only while you allow them.",
    tools: [
      "custom_code_get",
      "custom_code_set",
      "code_files_list",
      "code_file_read",
      "code_files_read",
      "code_file_patch",
      "code_file_rename",
      "code_file_check",
      "theme_toggle_add",
      "code_file_write",
      "code_file_delete",
    ],
  },
  {
    id: "journal-tools",
    title: "Journal",
    intro: "What the agent did, undo and redo, checkpoints and restoring to one.",
    tools: [
      "activity_list",
      "activity_get",
      "activity_checkpoint",
      "activity_undo",
      "activity_redo",
      "activity_restore",
      "activity_open",
    ],
  },
  {
    id: "knowledge",
    title: "Knowledge",
    intro: "How Framer behaves, from live builds (no design advice), and Framer's own DSL reference and guides.",
    tools: ["framer_guide", "framer_docs", "framer_read"],
  },
];

/**
 * What a tool needs besides Sitewright: `plugin` works through the plugin alone; `partial` works without a key but
 * does more with one; `key` needs the project's Server API key; `editor` needs the plugin itself; `local` never
 * reaches Framer.
 */
const NEEDS = {
  key: [
    "framer_read",
    "cms_seo_collection",
    "cms_interlink",
    "blog_add",
    "site_audit",
    "rich_text_audit",
    "color_token_swap",
    "node_clone",
    "node_screenshot",
    "components_read",
    "icons_search",
    "framer_docs",
    "cms_collection_delete",
    "effects_set",
    "shaders_read",
    "component_make_local",
    "component_detach",
    "link_styles_list",
    "link_styles_upsert",
    "link_styles_delete",
    "styles_usage",
    "localization_get",
    "localization_set",
    "locale_add",
    "reference_screenshot",
    "publish_preview",
    "site_settings_set",
  ],
  partial: [
    "nodes_read",
    "design_apply",
    "seo_audit",
    "links_check",
    "images_check",
    "marketplace_item",
    "template_audit",
    "text_replace",
    "site_settings_get",
  ],
  editor: [
    "selection_get",
    "selection_wait",
    "nodes_select",
    "node_show",
    "nodes_zoom",
    "plugin_data_get",
    "plugin_data_set",
    "svg_add",
  ],
  local: [
    "framer_status",
    "framer_connect",
    "framer_guide",
    "live_check",
    "activity_list",
    "activity_get",
    "activity_checkpoint",
    "activity_open",
  ],
};

const NEEDS_LABELS = {
  plugin: { label: "Plugin", title: "Works through the plugin alone, without a Server API key" },
  partial: { label: "Plugin · more with a key", title: "Works without a key; a Server API key adds more" },
  key: { label: "Server API key", title: "Needs the project's Server API key" },
  editor: { label: "Plugin only", title: "Runs in the open editor, through the plugin" },
  local: { label: "Local", title: "Runs in Sitewright itself" },
};

const home = await mkdtemp(join(tmpdir(), "sitewright-docs-"));
const client = new Client({
  name: "docs",
  version: "0.0.0",
});

try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [entry],
      env: {
        ...process.env,
        SITEWRIGHT_HOME: home,
        SITEWRIGHT_PLUGIN_BRIDGE: "off",
        LOG_LEVEL: "error",
      },
    }),
  );

  const { tools } = await client.listTools();
  const html = render(tools);
  const source = await readFile(page, "utf8");
  const start = source.indexOf(START);
  const end = source.indexOf(END);

  if (start === -1 || end === -1) {
    throw new Error(`The page has no ${START} … ${END} markers.`);
  }

  await writeFile(page, `${source.slice(0, start + START.length)}\n${html}\n${source.slice(end)}`);
  console.log(`Wrote ${tools.length} tools to ${page}`);
} finally {
  await client.close();
  await rm(home, { recursive: true, force: true });
}

function render(tools) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  const grouped = GROUPS.flatMap((group) => group.tools);
  const missing = tools.filter((tool) => !grouped.includes(tool.name)).map((tool) => tool.name);
  const unknown = grouped.filter((name) => !byName.has(name));

  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `Group every tool once. Not grouped: ${missing.join(", ") || "none"}; unknown: ${unknown.join(", ") || "none"}.`,
    );
  }

  const names = [...byName.keys()];

  return GROUPS.map(
    (group) => `<section class="tool-group" id="${group.id}" data-group>
  <h3>${escapeHtml(group.title)} <span>${group.tools.length}</span></h3>
  <p class="group-intro">${escapeHtml(group.intro)}</p>
${group.tools.map((name) => tool(byName.get(name), names)).join("\n")}
</section>`,
  ).join("\n");
}

function tool(definition, names) {
  const { name, title, description, inputSchema, annotations = {} } = definition;
  const needs = Object.entries(NEEDS).find(([, list]) => list.includes(name))?.[0] ?? "plugin";
  const effect = annotations.readOnlyHint
    ? ["read", "Reads"]
    : annotations.destructiveHint
      ? ["destructive", "Destructive"]
      : ["write", "Changes"];
  const params = parameters(inputSchema);

  return `  <article class="tool" id="${name}" data-tool="${name} ${escapeHtml(title ?? "")} ${escapeHtml(description ?? "").toLowerCase()}">
    <header>
      <h4><a href="#${name}">${name}</a></h4>
      <span class="badge ${effect[0]}">${effect[1]}</span>
      <span class="badge needs-${needs}" title="${NEEDS_LABELS[needs].title}">${NEEDS_LABELS[needs].label}</span>
    </header>
    ${title === undefined ? "" : `<p class="tool-title">${escapeHtml(title)}</p>`}
    <p>${linkTools(escapeHtml(description ?? ""), names, name)}</p>
${params}
  </article>`;
}

function parameters(schema) {
  const properties = Object.entries(schema?.properties ?? {});

  if (properties.length === 0) {
    return `    <p class="no-params">No parameters.</p>`;
  }

  const required = new Set(schema.required ?? []);
  const rows = properties.map(([key, value]) => {
    const notes = [
      required.has(key) && value.default === undefined ? `<span class="req">required</span>` : "",
      value.default === undefined
        ? ""
        : `<span class="def">default <code>${escapeHtml(JSON.stringify(value.default))}</code></span>`,
    ]
      .filter(Boolean)
      .join(" ");
    const nested = fields(value.type === "array" ? value.items : value);

    return `      <tr><th scope="row"><code>${key}</code></th><td><code class="type">${escapeHtml(typeOf(value))}</code></td><td>${escapeHtml(value.description ?? "")}${notes === "" ? "" : ` ${notes}`}${nested}</td></tr>`;
  });

  return `    <div class="params"><table>
      <thead><tr><th scope="col">Parameter</th><th scope="col">Type</th><th scope="col">What</th></tr></thead>
      <tbody>
${rows.join("\n")}
      </tbody>
    </table></div>`;
}

/** The fields of an object parameter (or of its array's items), one level down. */
function fields(schema) {
  const properties = Object.entries(schema?.properties ?? {});

  if (schema?.type !== "object" || properties.length === 0) {
    return "";
  }

  const required = new Set(schema.required ?? []);

  return `<ul class="fields">${properties
    .map(
      ([key, value]) =>
        `<li><code>${key}</code> <code class="type">${escapeHtml(typeOf(value))}</code>${required.has(key) ? "" : ' <span class="opt">optional</span>'}${value.description ? ` — ${escapeHtml(value.description)}` : ""}</li>`,
    )
    .join("")}</ul>`;
}

function typeOf(schema) {
  if (schema === undefined) {
    return "any";
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if (schema.const !== undefined) {
    return JSON.stringify(schema.const);
  }

  const variants = schema.anyOf ?? schema.oneOf;

  if (Array.isArray(variants)) {
    return [...new Set(variants.map(typeOf))].join(" | ");
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];

  return types
    .map((type) => {
      if (type === "array") {
        return `${typeOf(schema.items)}[]`;
      }

      if (type === "integer") {
        return "number";
      }

      return type ?? "any";
    })
    .join(" | ");
}

/** Tool names in a description become links to their entries. */
function linkTools(text, names, self) {
  return text.replace(/\b[a-z]+(?:_[a-z]+)+\b/g, (word) =>
    names.includes(word) && word !== self ? `<a href="#${word}"><code>${word}</code></a>` : word,
  );
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
