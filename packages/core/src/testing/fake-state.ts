import type { FakeFramerState, FakeTextStyle } from "../types/testing.ts";

export function defaultState(): FakeFramerState {
  return {
    project: {
      id: "project-1",
      name: "Sandbox",
    },
    colorStyles: [],
    textStyles: [],
    fonts: [
      {
        selector: "GF;Inter-regular",
        family: "Inter",
        weight: 400,
        style: "normal",
      },
      {
        selector: "GF;Inter-italic",
        family: "Inter",
        weight: 400,
        style: "italic",
      },
      {
        selector: "GF;Inter-700",
        family: "Inter",
        weight: 700,
        style: "normal",
      },
      {
        selector: "GF;Roboto-regular",
        family: "Roboto",
        weight: 400,
        style: "normal",
      },
      {
        selector: "GF;Roboto Mono-regular",
        family: "Roboto Mono",
        weight: 400,
        style: "normal",
      },
    ],
    projectFonts: [],
    webPages: [
      {
        id: "page-home",
        path: "/",
        draft: false,
        collectionId: null,
      },
    ],
    designPages: [],
    redirects: [],
    canvas: [],
    publishInfo: {
      production: null,
      staging: null,
    },
    unpublishedChanges: [],
    deployments: [],
    components: [],
    collections: [],
    defaultLocale: {
      id: "default",
      code: "en-US",
      name: "English",
      slug: "",
    },
    locales: [],
    localizationGroups: [],
    branching: true,
    breakpoints: [
      {
        id: "breakpoint-desktop",
        name: "Desktop",
        width: 1200,
      },
      {
        id: "breakpoint-tablet",
        name: "Tablet",
        width: 810,
      },
      {
        id: "breakpoint-phone",
        name: "Phone",
        width: 390,
      },
    ],
    appliedDsl: [],
    serializedNodes: {},
    systemPrompt: "# Overview\n\nFake prompt.\n",
    nextApplyResult: undefined,
    uploadedImages: [],
    uploadedFiles: [],
    svgs: [],
    selection: [],
    instances: [],
    moves: [],
    customCode: {
      headStart: {
        disabled: false,
        html: null,
      },
      headEnd: {
        disabled: false,
        html: null,
      },
      bodyStart: {
        disabled: false,
        html: null,
      },
      bodyEnd: {
        disabled: false,
        html: null,
      },
    },
    codeFiles: [],
    stockImages: [],
    iconSets: [],
    componentControls: {},
    unloadedScopes: [],
    instanceControls: {},
    publishes: 0,
  };
}

/** Ids of created objects share one sequence, like "color-1", "text-2". */
export function createIdSequence(): (prefix: string) => string {
  let sequence = 0;

  return (prefix) => `${prefix}-${++sequence}`;
}

/** Framer stores style paths with a leading slash and names them after the last segment. */
export function stylePath(path: string): { path: string; name: string } {
  const segments = path.split("/").filter(Boolean);

  return {
    path: `/${segments.join("/")}`,
    name: segments.at(-1) ?? path,
  };
}

/** A text style with Framer's defaults. */
export function newTextStyle(id: string, path: string): FakeTextStyle {
  return {
    id,
    ...stylePath(path),
    tag: "p",
    font: {
      selector: "GF;Inter-regular",
      family: "Inter",
      weight: 400,
      style: "normal",
    },
    color: "rgb(0, 0, 0)",
    transform: "none",
    alignment: "left",
    decoration: "none",
    balance: false,
    minWidth: 0,
    fontSize: "16px",
    letterSpacing: "0px",
    lineHeight: "1.4em",
    paragraphSpacing: 0,
    breakpoints: [],
  };
}
