import type { AnyOperation } from "../types/operations.ts";
import { iconsSearch } from "./assets/icons-search.ts";
import { imageUpload } from "./assets/image-upload.ts";
import { imagesSearch } from "./assets/images-search.ts";
import { svgAdd } from "./assets/svg-add.ts";
import { codeFileDelete, codeFileRead, codeFilesList, codeFileWrite } from "./code/code-files.ts";
import { customCodeGet, customCodeSet } from "./code/custom-code.ts";
import { colorTokensDelete } from "./color-tokens/delete.ts";
import { colorTokensList } from "./color-tokens/list.ts";
import { colorTokensUpsert } from "./color-tokens/upsert.ts";
import { componentsRead } from "./components/components-read.ts";
import { componentControlsSet } from "./components/controls-set.ts";
import { designApply } from "./design/apply.ts";
import { fontsSearch } from "./fonts/search.ts";
import { historyRevert } from "./history/revert.ts";
import { layoutAudit } from "./nodes/audit.ts";
import { breakpointsAdd } from "./nodes/breakpoints.ts";
import { nodesRead } from "./nodes/read.ts";
import { selectionGet } from "./nodes/selection.ts";
import { projectCapabilities } from "./project/capabilities.ts";
import { projectEditorUrl } from "./project/editor-url.ts";
import { projectInfo } from "./project/info.ts";
import { projectOverview } from "./project/overview.ts";
import { projectPublish } from "./project/publish.ts";
import { textStylesDelete } from "./text-styles/delete.ts";
import { textStylesList } from "./text-styles/list.ts";
import { textStylesUpsert } from "./text-styles/upsert.ts";

/** Every operation by name: the single source for the MCP server and the Framer plugin. */
const OPERATIONS: readonly AnyOperation[] = [
  projectOverview,
  colorTokensList,
  colorTokensUpsert,
  colorTokensDelete,
  textStylesList,
  textStylesUpsert,
  textStylesDelete,
  fontsSearch,
  nodesRead,
  layoutAudit,
  selectionGet,
  designApply,
  breakpointsAdd,
  historyRevert,
  projectInfo,
  projectCapabilities,
  projectEditorUrl,
  projectPublish,
  imagesSearch,
  imageUpload,
  svgAdd,
  iconsSearch,
  componentsRead,
  componentControlsSet,
  customCodeGet,
  customCodeSet,
  codeFilesList,
  codeFileRead,
  codeFileWrite,
  codeFileDelete,
];

const byName = new Map(OPERATIONS.map((operation) => [operation.name, operation]));

export function findOperation(name: string): AnyOperation | undefined {
  return byName.get(name);
}
