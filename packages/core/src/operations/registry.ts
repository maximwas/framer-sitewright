import type { AnyOperation } from "../types/operations.ts";
import { iconsSearch } from "./assets/icons-search.ts";
import { shadersRead } from "./assets/shaders-read.ts";
import { cmsCollectionDelete } from "./cms/collections.ts";
import { colorTokensSwap } from "./color-tokens/swap.ts";
import { componentsRead } from "./components/components-read.ts";
import { componentDetach } from "./components/detach.ts";
import { componentMakeLocal } from "./components/make-local.ts";
import { nodesClone } from "./nodes/clone.ts";
import { PLUGIN_OPERATIONS } from "./plugin-registry.ts";
import { publishPreview } from "./project/publish-preview.ts";
import { framerRead } from "./project/read-project.ts";
import { richTextAudit } from "./site/audits.ts";
import { referenceScreenshot } from "./site/reference-screenshot.ts";
import { siteSettingsSet } from "./site/settings.ts";
import { stylesUsage } from "./styles/usage.ts";

/** The operations that need framer.agent outright: the server runs them through the Server API, never the plugin. */
const AGENT_ONLY_OPERATIONS: readonly AnyOperation[] = [
  stylesUsage,
  iconsSearch,
  componentsRead,
  componentMakeLocal,
  componentDetach,
  cmsCollectionDelete,
  colorTokensSwap,
  nodesClone,
  richTextAudit,
  framerRead,
  siteSettingsSet,
  shadersRead,
  referenceScreenshot,
  publishPreview,
];

/** Every operation, in one list for the server and the journal; the plugin uses PLUGIN_OPERATIONS. */
export const OPERATIONS: readonly AnyOperation[] = [...PLUGIN_OPERATIONS, ...AGENT_ONLY_OPERATIONS];

const byName = new Map(OPERATIONS.map((operation) => [operation.name, operation]));

export function findOperation(name: string): AnyOperation | undefined {
  return byName.get(name);
}
