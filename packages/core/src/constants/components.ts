/** Journal notes: what undo cannot take back after the component tools. */
export const MAKE_LOCAL_UNDO_NOTE =
  "Undo does not turn a local copy back into the external component: the copy stays in the project.";
export const DETACH_UNDO_NOTE = "Undo does not bring a detached instance back: insert the component again.";

/** How far up the parents an inserted layer's web page is looked for; deeper, its undo runs on the home page. */
export const PAGE_LOOKUP_DEPTH = 32;

/** What needs_confirmation means, in Sitewright's terms: Framer's own message names its internal tools. */
export const MAKE_LOCAL_CONFIRMATION =
  "Nothing changed yet: the component may have other instances in the project. Ask the user whether only this instance should use the local copy (replaceAll false) or every instance (replaceAll true), then call component_make_local again with that replaceAll.";

export const MAKE_LOCAL_BLOCKED_HINT =
  "Only an instance of an external component (Marketplace, shared library) can be made local, and Framer refuses some code components: tune those with component_controls_set. A project component is local already: change it with design_apply, or detach this instance with component_detach.";

export const DETACH_BLOCKED_HINT =
  "Detach works on an instance of a project component designed in Framer: make a Marketplace or shared-library instance local first with component_make_local. A code component has no layers to detach.";

/** Framer's agent names its internal tools in its messages; these are Sitewright's tools for the same thing. */
export const FRAMER_AGENT_TOOL_NAMES: Readonly<Record<string, string>> = {
  make_external_component_local: "component_make_local",
  flatten_component_instance: "component_detach",
};

/** What places a layer in its parent: a detached root takes them over from the instance it replaces. */
export const PLACEMENT_ATTRIBUTES = [
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "centerX",
  "centerY",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "aspectRatio",
] as const;

/** Parent layouts that place their children in flow: inserted layers go in there as position relative. */
export const FLOW_LAYOUTS: readonly unknown[] = ["stack", "grid"];

/** Inserted layers in a stack or grid parent: in its flow. */
export const FLOW_PLACEMENT = { position: "relative" } as const;

/** Inserted layers in a parent without a flow layout: its top left corner. */
export const FREE_PLACEMENT = {
  position: "absolute",
  left: "0px",
  top: "0px",
} as const;
