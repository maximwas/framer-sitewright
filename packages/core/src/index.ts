// Public API of @sitewright/core for its adapters: the MCP server and the Framer plugin.

export {
  BridgeError,
  decodePluginToServer,
  decodeServerToPlugin,
  encode,
  fromWireError,
  journalFromWireError,
  toWireError,
} from "./bridge/protocol.ts";
export { localAppOrigins, parsePluginMessage, parseWindowMessage, relayMessage } from "./bridge/relay.ts";
export { SVG_DATA_URL_PREFIX } from "./constants/assets.ts";
export {
  BRIDGE_INFO_PATH,
  BRIDGE_PATH,
  BRIDGE_PROTOCOL_VERSION,
  BRIDGE_WINDOW_NAME,
  CloseCode,
  DEFAULT_PLUGIN_ORIGINS,
  LOCAL_APP_PORT,
  LOCAL_STATUS_PATH,
  MAX_MESSAGE_BYTES,
  NO_RECONNECT_CODES,
} from "./constants/bridge.ts";
export { ACTIVITY_VIEWS, PREVIEW_IMAGE_ORIGINS } from "./constants/history.ts";
export { MOTION_PRESET_NOTES, MOTION_PRESETS } from "./constants/motion.ts";
export { KEY_SETUP_HINT, PRODUCT, SUPPORT_LINKS } from "./constants/product.ts";
export { SETTING_ITEMS } from "./constants/settings.ts";
export { PLUGIN_CHANGED_EVENT, WEB_SOCKET_PATH, WebCloseCode } from "./constants/web.ts";
export { findSection, searchSections, sliceContent, splitSections } from "./docs/sections.ts";
export { OperationError } from "./errors.ts";
export { requireAgent, requireScreenshot } from "./framer/runtime.ts";
export {
  aliasesOf,
  describeOperation,
  isRedoable,
  isUndoable,
  refOf,
  restoreTargets,
  revertState,
  revertTitle,
  summarizeEntry,
} from "./history/activity.ts";
export { describeCall, trimDetail } from "./history/activity-detail.ts";
export { applyAliases } from "./history/aliases.ts";
export { HistoryRecorder, withJournal } from "./history/recorder.ts";
export { fileUpload } from "./operations/assets/file-upload.ts";
export { iconsSearch } from "./operations/assets/icons-search.ts";
export { imageUpload } from "./operations/assets/image-upload.ts";
export { imagesSearch } from "./operations/assets/images-search.ts";
export { shadersRead } from "./operations/assets/shaders-read.ts";
export { svgAdd } from "./operations/assets/svg-add.ts";
export {
  cmsCollectionCreate,
  cmsCollectionDelete,
  cmsCollectionsList,
} from "./operations/cms/collections.ts";
export { cmsFieldsSet } from "./operations/cms/fields.ts";
export { cmsItemsDelete, cmsItemsList, cmsItemsOrder, cmsItemsUpsert } from "./operations/cms/items.ts";
export { codeFileDelete, codeFileRead, codeFilesList, codeFileWrite } from "./operations/code/code-files.ts";
export { codeFileCheck, codeFilePatch, codeFileRename, codeFilesRead } from "./operations/code/code-tools.ts";
export { customCodeGet, customCodeSet } from "./operations/code/custom-code.ts";
export { colorTokensDelete } from "./operations/color-tokens/delete.ts";
export { colorTokensList } from "./operations/color-tokens/list.ts";
export { colorTokensSwap } from "./operations/color-tokens/swap.ts";
export { colorTokensUpsert } from "./operations/color-tokens/upsert.ts";
export { componentsRead } from "./operations/components/components-read.ts";
export { componentControlsSet } from "./operations/components/controls-set.ts";
export { componentDetach } from "./operations/components/detach.ts";
export { componentInsert } from "./operations/components/insert.ts";
export { componentInstances } from "./operations/components/instances.ts";
export { componentMakeLocal } from "./operations/components/make-local.ts";
export { needsAgent, runOperation } from "./operations/define.ts";
export { designApply } from "./operations/design/apply.ts";
export { editorNavigate, editorSelect, editorZoom, selectionWait } from "./operations/editor/editor.ts";
export { fontsInLibrary } from "./operations/fonts/in-library.ts";
export { fontsSearch } from "./operations/fonts/search.ts";
export { fontsUsed } from "./operations/fonts/used.ts";
export { historyRevert } from "./operations/history/revert.ts";
export { linkStylesDelete } from "./operations/link-styles/delete.ts";
export { linkStylesList } from "./operations/link-styles/list.ts";
export { linkStylesUpsert } from "./operations/link-styles/upsert.ts";
export { localeAdd, localesList, localizationGet, localizationSet } from "./operations/localization/localization.ts";
export { effectsSet } from "./operations/motion/effects-set.ts";
export { layoutAudit } from "./operations/nodes/audit.ts";
export { breakpointsAdd } from "./operations/nodes/breakpoints.ts";
export { breakpointsSuggest } from "./operations/nodes/breakpoints-suggest.ts";
export { nodesClone } from "./operations/nodes/clone.ts";
export { stylesCopy } from "./operations/nodes/copy-styles.ts";
export { nodesFind } from "./operations/nodes/find.ts";
export { nodesQuery } from "./operations/nodes/query.ts";
export { nodesRead } from "./operations/nodes/read.ts";
export { selectionGet } from "./operations/nodes/selection.ts";
export { textReplace } from "./operations/nodes/text-replace.ts";
export { pagesCreate, pagesDelete, pagesDuplicate } from "./operations/pages/pages.ts";
export { pluginDataGet, pluginDataSet } from "./operations/plugin-data/plugin-data.ts";
export { projectCapabilities } from "./operations/project/capabilities.ts";
export { projectEditorUrl } from "./operations/project/editor-url.ts";
export { projectInfo } from "./operations/project/info.ts";
export { projectOverview } from "./operations/project/overview.ts";
export { projectPublish } from "./operations/project/publish.ts";
export { publishPreview } from "./operations/project/publish-preview.ts";
export { deploymentsList, publishStatus } from "./operations/project/publish-status.ts";
export { currentUser } from "./operations/project/user.ts";
export { redirectsList, redirectsSet } from "./operations/redirects/redirects.ts";
export { findOperation, OPERATIONS } from "./operations/registry.ts";
export { performanceAudit, richTextAudit, siteAudit } from "./operations/site/audits.ts";
export { a11yAudit, contrastCheck, imagesCheck, linksCheck, seoAudit } from "./operations/site/checks.ts";
export { referenceScreenshot } from "./operations/site/reference-screenshot.ts";
export { siteSettingsGet, siteSettingsSet } from "./operations/site/settings.ts";
export { templateAudit } from "./operations/site/template-audit.ts";
export { stylesUsage } from "./operations/styles/usage.ts";
export { textStylesDelete } from "./operations/text-styles/delete.ts";
export { textStylesList } from "./operations/text-styles/list.ts";
export { textStylesUpsert } from "./operations/text-styles/upsert.ts";
export {
  EventMessageSchema,
  JournaledResultSchema,
  PluginInfoSchema,
  RequestMessageSchema,
  ResponseMessageSchema,
} from "./schemas/bridge.ts";
export { CapabilitiesSchema } from "./schemas/capabilities.ts";
export {
  ActivityCallSchema,
  ActivityEntrySchema,
  ActivityNoteSchema,
  ActivitySummarySchema,
  EntryRefSchema,
  JournalProjectsSchema,
  RevertReportSchema,
} from "./schemas/history.ts";
export { KeySetParamsSchema, ProjectKeyStatusSchema } from "./schemas/keys.ts";
export { BridgeInfoSchema, LocalStatusSchema } from "./schemas/relay.ts";
export { McpSettingsPatchSchema, McpSettingsSchema } from "./schemas/settings.ts";
export { SiteFindingSchema } from "./schemas/site-checks.ts";
export { RevealParamsSchema, RevealResultSchema, WebClientMessageSchema } from "./schemas/web.ts";
export { bySeverity } from "./site-checks/values.ts";
export type {
  CallResultMessage,
  PluginInfo,
  PluginToServer,
  RequestMessage,
  ServerToPlugin,
} from "./types/bridge.ts";
export type { BranchAccess, Capabilities, CapabilityProbe, PlanLimit } from "./types/capabilities.ts";
export type { DocSection } from "./types/docs.ts";
export type { AgentPort, FramerRuntime, ScreenshotOptions, TransportKind } from "./types/framer.ts";
export type { FramerPort } from "./types/framer-port.ts";
export type {
  ActivityActor,
  ActivityCall,
  ActivityDetail,
  ActivityEntry,
  ActivityLayer,
  ActivityNote,
  ActivitySummary,
  ActivityView,
  ChangeCategory,
  JournalProject,
  JournalProjects,
  RevertReport,
  UndoStep,
} from "./types/history.ts";
export type { KeySetParams, ProjectKeyStatus } from "./types/keys.ts";
export type { AnyOperation, Operation, PluginPermission } from "./types/operations.ts";
export type { SupportLink } from "./types/product.ts";
export type { BridgeInfo, LocalStatus, PluginToWindow, WindowToPlugin } from "./types/relay.ts";
export type { McpSettings, McpSettingsPatch, SettingItem } from "./types/settings.ts";
export type { SiteFinding } from "./types/site-checks.ts";
export type { RevealResult, WebClientMessage } from "./types/web.ts";
export { errorMessage } from "./utils/errors.ts";
export { nodeNameOf } from "./utils/node-name.ts";
export { setupCommands } from "./utils/setup-commands.ts";
export { countOf } from "./utils/text.ts";
