/**
 * Operations that need framer.agent outright, so the plugin leaves them out of its bundle; asked for one, it answers
 * as they do without a Server API key. A test keeps this list equal to the registry's.
 */
export const AGENT_ONLY_OPERATION_NAMES: readonly string[] = [
  "styles.usage",
  "icons.search",
  "components.read",
  "components.makeLocal",
  "components.detach",
  "cms.collections.delete",
  "colorTokens.swap",
  "nodes.clone",
  "site.richText",
  "project.readProject",
  "site.settings.set",
  "shaders.read",
  "site.screenshot",
  "project.publishPreview",
];
