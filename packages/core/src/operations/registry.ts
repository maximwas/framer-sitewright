import type { AnyOperation } from "../types/operations.ts";
import { fileUpload } from "./assets/file-upload.ts";
import { iconsSearch } from "./assets/icons-search.ts";
import { imageUpload } from "./assets/image-upload.ts";
import { shadersRead } from "./assets/shaders-read.ts";
import { svgAdd } from "./assets/svg-add.ts";
import { cmsCollectionCreate, cmsCollectionDelete, cmsCollectionsList } from "./cms/collections.ts";
import { cmsFieldsSet } from "./cms/fields.ts";
import { cmsItemsDelete, cmsItemsList, cmsItemsOrder, cmsItemsUpsert } from "./cms/items.ts";
import { cmsInterlink, cmsSeoCollection } from "./cms/seo.ts";
import { codeFileDelete, codeFileRead, codeFilesList, codeFileWrite } from "./code/code-files.ts";
import { codeFileCheck, codeFilePatch, codeFileRename, codeFilesRead } from "./code/code-tools.ts";
import { customCodeGet, customCodeSet } from "./code/custom-code.ts";
import { colorTokensDelete } from "./color-tokens/delete.ts";
import { colorTokensList } from "./color-tokens/list.ts";
import { colorTokensSwap } from "./color-tokens/swap.ts";
import { colorTokensUpsert } from "./color-tokens/upsert.ts";
import { componentsRead } from "./components/components-read.ts";
import { componentControlsSet } from "./components/controls-set.ts";
import { componentDetach } from "./components/detach.ts";
import { componentInsert } from "./components/insert.ts";
import { componentInstances } from "./components/instances.ts";
import { componentMakeLocal } from "./components/make-local.ts";
import { designApply } from "./design/apply.ts";
import { blogAdd, themeToggleAdd } from "./design/builders.ts";
import { editorNavigate, editorSelect, editorZoom, selectionWait } from "./editor/editor.ts";
import { fontsInLibrary } from "./fonts/in-library.ts";
import { fontsSearch } from "./fonts/search.ts";
import { fontsUsed } from "./fonts/used.ts";
import { historyRevert } from "./history/revert.ts";
import { linkStylesDelete } from "./link-styles/delete.ts";
import { linkStylesList } from "./link-styles/list.ts";
import { linkStylesUpsert } from "./link-styles/upsert.ts";
import { localeAdd, localesList, localizationGet, localizationSet } from "./localization/localization.ts";
import { effectsSet } from "./motion/effects-set.ts";
import { layoutAudit } from "./nodes/audit.ts";
import { breakpointsAdd } from "./nodes/breakpoints.ts";
import { breakpointsSuggest } from "./nodes/breakpoints-suggest.ts";
import { nodesClone } from "./nodes/clone.ts";
import { stylesCopy } from "./nodes/copy-styles.ts";
import { nodesFind } from "./nodes/find.ts";
import { nodesQuery } from "./nodes/query.ts";
import { nodesRead } from "./nodes/read.ts";
import { selectionGet } from "./nodes/selection.ts";
import { textReplace } from "./nodes/text-replace.ts";
import { pagesCreate, pagesDelete, pagesDuplicate } from "./pages/pages.ts";
import { pluginDataGet, pluginDataSet } from "./plugin-data/plugin-data.ts";
import { projectCapabilities } from "./project/capabilities.ts";
import { projectEditorUrl } from "./project/editor-url.ts";
import { projectInfo } from "./project/info.ts";
import { projectOverview } from "./project/overview.ts";
import { projectPublish } from "./project/publish.ts";
import { publishPreview } from "./project/publish-preview.ts";
import { deploymentsList, publishStatus } from "./project/publish-status.ts";
import { framerRead } from "./project/read-project.ts";
import { currentUser } from "./project/user.ts";
import { redirectsList, redirectsSet } from "./redirects/redirects.ts";
import { performanceAudit, richTextAudit, siteAudit } from "./site/audits.ts";
import { a11yAudit, contrastCheck, imagesCheck, linksCheck, seoAudit } from "./site/checks.ts";
import { referenceScreenshot } from "./site/reference-screenshot.ts";
import { siteSettingsGet, siteSettingsSet } from "./site/settings.ts";
import { templateAudit } from "./site/template-audit.ts";
import { stylesUsage } from "./styles/usage.ts";
import { textStylesDelete } from "./text-styles/delete.ts";
import { textStylesList } from "./text-styles/list.ts";
import { textStylesUpsert } from "./text-styles/upsert.ts";

/** Every operation by name: the single source for the MCP server and the Framer plugin. */
/** Every operation, in one list for the server, the plugin and the journal. */
export const OPERATIONS: readonly AnyOperation[] = [
  projectOverview,
  colorTokensList,
  colorTokensUpsert,
  colorTokensDelete,
  textStylesList,
  textStylesUpsert,
  textStylesDelete,
  linkStylesList,
  linkStylesUpsert,
  linkStylesDelete,
  stylesUsage,
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
  imageUpload,
  fileUpload,
  svgAdd,
  iconsSearch,
  componentsRead,
  componentInstances,
  componentControlsSet,
  componentInsert,
  componentMakeLocal,
  componentDetach,
  customCodeGet,
  customCodeSet,
  codeFilesList,
  codeFileRead,
  codeFileWrite,
  codeFileDelete,
  cmsCollectionsList,
  cmsCollectionCreate,
  cmsCollectionDelete,
  cmsFieldsSet,
  cmsItemsList,
  cmsItemsUpsert,
  cmsItemsDelete,
  cmsItemsOrder,
  localesList,
  localizationGet,
  localizationSet,
  pagesCreate,
  pagesDelete,
  nodesFind,
  nodesQuery,
  breakpointsSuggest,
  editorSelect,
  editorNavigate,
  editorZoom,
  selectionWait,
  pluginDataGet,
  pluginDataSet,
  currentUser,
  fontsUsed,
  colorTokensSwap,
  stylesCopy,
  nodesClone,
  codeFilesRead,
  codeFilePatch,
  codeFileRename,
  codeFileCheck,
  textReplace,
  redirectsList,
  redirectsSet,
  publishStatus,
  deploymentsList,
  linksCheck,
  seoAudit,
  imagesCheck,
  a11yAudit,
  siteAudit,
  performanceAudit,
  richTextAudit,
  cmsSeoCollection,
  cmsInterlink,
  blogAdd,
  themeToggleAdd,
  framerRead,
  contrastCheck,
  templateAudit,
  siteSettingsGet,
  siteSettingsSet,
  fontsInLibrary,
  effectsSet,
  shadersRead,
  pagesDuplicate,
  localeAdd,
  referenceScreenshot,
  publishPreview,
];

const byName = new Map(OPERATIONS.map((operation) => [operation.name, operation]));

export function findOperation(name: string): AnyOperation | undefined {
  return byName.get(name);
}
