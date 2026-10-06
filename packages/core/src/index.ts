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
export { PRODUCT, SUPPORT_LINKS } from "./constants/product.ts";
export { SETTING_ITEMS } from "./constants/settings.ts";
export { WEB_SOCKET_PATH, WebCloseCode } from "./constants/web.ts";
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
export { svgAdd } from "./operations/assets/svg-add.ts";
export {
  cmsCollectionCreate,
  cmsCollectionDelete,
  cmsCollectionsList,
} from "./operations/cms/collections.ts";
export { cmsFieldsSet } from "./operations/cms/fields.ts";
export { cmsItemsDelete, cmsItemsList, cmsItemsOrder, cmsItemsUpsert } from "./operations/cms/items.ts";
export { codeFileDelete, codeFileRead, codeFilesList, codeFileWrite } from "./operations/code/code-files.ts";
export { customCodeGet, customCodeSet } from "./operations/code/custom-code.ts";
export { colorTokensDelete } from "./operations/color-tokens/delete.ts";
export { colorTokensList } from "./operations/color-tokens/list.ts";
export { colorTokensUpsert } from "./operations/color-tokens/upsert.ts";
export { componentsRead } from "./operations/components/components-read.ts";
export { componentControlsSet } from "./operations/components/controls-set.ts";
export { componentInsert } from "./operations/components/insert.ts";
export { needsAgent, runOperation } from "./operations/define.ts";
export { designApply } from "./operations/design/apply.ts";
export { fontsInLibrary } from "./operations/fonts/in-library.ts";
export { fontsSearch } from "./operations/fonts/search.ts";
export { historyRevert } from "./operations/history/revert.ts";
export { localesList, localizationGet, localizationSet } from "./operations/localization/localization.ts";
export { layoutAudit } from "./operations/nodes/audit.ts";
export { breakpointsAdd } from "./operations/nodes/breakpoints.ts";
export { nodesFind } from "./operations/nodes/find.ts";
export { nodesRead } from "./operations/nodes/read.ts";
export { selectionGet } from "./operations/nodes/selection.ts";
export { textReplace } from "./operations/nodes/text-replace.ts";
export { pagesCreate, pagesDelete } from "./operations/pages/pages.ts";
export { projectCapabilities } from "./operations/project/capabilities.ts";
export { projectEditorUrl } from "./operations/project/editor-url.ts";
export { projectInfo } from "./operations/project/info.ts";
export { projectOverview } from "./operations/project/overview.ts";
export { projectPublish } from "./operations/project/publish.ts";
export { deploymentsList, publishStatus } from "./operations/project/publish-status.ts";
export { redirectsList, redirectsSet } from "./operations/redirects/redirects.ts";
export { findOperation } from "./operations/registry.ts";
export { a11yAudit, contrastCheck, imagesCheck, linksCheck, seoAudit } from "./operations/site/checks.ts";
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
export { RevealParamsSchema, RevealResultSchema, WebClientMessageSchema } from "./schemas/web.ts";
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
export type { RevealResult, WebClientMessage } from "./types/web.ts";
export { errorMessage } from "./utils/errors.ts";
export { nodeNameOf } from "./utils/node-name.ts";
export { setupCommands } from "./utils/setup-commands.ts";
