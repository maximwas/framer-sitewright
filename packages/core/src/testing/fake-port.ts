import { FRAMER_TAG_STYLE_NAMES } from "../constants/text-styles.ts";
import type {
  CodeFileHandle,
  ColorStyleHandle,
  ComponentData,
  DesignPageData,
  FramerPort,
  TextStyleHandle,
  TextStyleWrite,
  WebPageData,
} from "../types/framer-port.ts";
import type { FakeColorStyle, FakeFramerState, FakeTextStyle } from "../types/testing.ts";
import { normalizeColor } from "../utils/color.ts";
import { newTextStyle, stylePath } from "./fake-state.ts";

/** The Plugin API over the fake state. Handles are snapshots with methods, like Framer's ColorStyle / TextStyle. */
export function createFakePort(state: FakeFramerState, nextId: (prefix: string) => string): FramerPort {
  function colorHandle(style: FakeColorStyle): ColorStyleHandle {
    return {
      ...style,
      setAttributes: async (update) => {
        const current = state.colorStyles.find((candidate) => candidate.id === style.id);

        if (current === undefined) {
          return null;
        }

        const path = update.path ?? update.name;

        if (path !== undefined) {
          Object.assign(current, stylePath(path));
        }

        if (update.light !== undefined) {
          current.light = normalizeColor(update.light);
        }

        if (update.dark !== undefined) {
          current.dark = update.dark === null ? null : normalizeColor(update.dark);
        }

        return colorHandle(current);
      },
      remove: async () => {
        state.colorStyles = state.colorStyles.filter((candidate) => candidate.id !== style.id);
      },
    };
  }

  function textHandle(style: FakeTextStyle): TextStyleHandle {
    return {
      ...style,
      setAttributes: async (update) => {
        const current = state.textStyles.find((candidate) => candidate.id === style.id);

        if (current === undefined) {
          return null;
        }

        applyTextWrite(current, update);

        return textHandle(current);
      },
      remove: async () => {
        state.textStyles = state.textStyles.filter((candidate) => candidate.id !== style.id);
      },
    };
  }

  function getNodesWithType(type: "WebPageNode"): Promise<readonly WebPageData[]>;
  function getNodesWithType(type: "DesignPageNode"): Promise<readonly DesignPageData[]>;
  function getNodesWithType(type: "ComponentNode"): Promise<readonly ComponentData[]>;
  async function getNodesWithType(
    type: "WebPageNode" | "DesignPageNode" | "ComponentNode",
  ): Promise<readonly (WebPageData | DesignPageData | ComponentData)[]> {
    switch (type) {
      case "WebPageNode":
        return [...state.webPages];
      case "DesignPageNode":
        return [...state.designPages];
      case "ComponentNode":
        return [...state.components];
    }
  }

  function codeFileHandle(file: FakeFramerState["codeFiles"][number]): CodeFileHandle {
    return {
      ...file,
      exports: [],
      setFileContent: async (code) => {
        file.content = code;

        return codeFileHandle(file);
      },
      remove: async () => {
        state.codeFiles = state.codeFiles.filter((candidate) => candidate.id !== file.id);
      },
    };
  }

  return {
    getProjectInfo: async () => state.project,
    getColorStyles: async () => state.colorStyles.map(colorHandle),
    createColorStyle: async (attributes) => {
      const style: FakeColorStyle = {
        id: nextId("color"),
        ...stylePath(attributes.path ?? attributes.name ?? ""),
        light: normalizeColor(attributes.light),
        dark: attributes.dark === undefined || attributes.dark === null ? null : normalizeColor(attributes.dark),
      };

      state.colorStyles.push(style);

      return colorHandle(style);
    },
    getTextStyles: async () => state.textStyles.map(textHandle),
    createTextStyle: async (attributes) => {
      const style = newTextStyle(nextId("text"), attributes.path ?? attributes.name ?? "");

      applyTextWrite(style, attributes);
      state.textStyles.push(style);

      return textHandle(style);
    },
    getFonts: async () => [...state.fonts],
    getFont: async (family, attributes) =>
      state.fonts.find(
        (font) =>
          font.family === family &&
          font.weight === (attributes?.weight ?? 400) &&
          font.style === (attributes?.style ?? "normal"),
      ) ?? null,
    getNodesWithType,
    getCollections: async () => [...state.collections],
    getChildren: async (nodeId) =>
      state.webPages.find((page) => page.id === nodeId)?.path === "/"
        ? state.breakpointWidths.map((width, index) => ({
            id: `breakpoint-${index}`,
            isBreakpoint: true,
            width: `${width}px`,
          }))
        : [],
    removeNodes: async (nodeIds) => {
      state.webPages = state.webPages.filter((page) => !nodeIds.includes(page.id));
    },
    uploadImage: async ({ image, name }) => {
      const id = nextId("image");
      const url = image.startsWith("https://") ? image : `https://framerusercontent.com/images/${id}`;

      state.uploadedImages.push({
        id,
        url,
        name: name ?? null,
      });

      return {
        id,
        url,
      };
    },
    addSVG: async ({ svg }) => {
      state.svgs.push(svg);
      // Like the editor, select what was inserted.
      state.selection = [nextId("svg")];
    },
    getSelection: async () => state.selection.map((id) => ({ id })),
    publish: async () => {
      state.publishes += 1;

      return {
        deployment: {
          id: `deployment-${state.publishes}`,
          status: "pending",
        },
        hostnames: [
          {
            hostname: "sandbox.framer.website",
            type: "default",
            isPrimary: true,
            isPublished: true,
          },
        ],
      };
    },
    getNode: async (nodeId) => {
      const controls = state.instanceControls[nodeId];

      return controls === undefined
        ? null
        : {
            id: nodeId,
            controls,
            setAttributes: async ({ controls: next }: { controls: Record<string, unknown> }) => {
              state.instanceControls[nodeId] = next;
            },
          };
    },
    // The fake project has no canvas nodes to write: node work goes through the fake framer.agent instead.
    getParent: async () => null,
    createFrameNode: async () => {
      throw new Error("The fake project has no Plugin API canvas nodes.");
    },
    setAttributes: async () => {
      throw new Error("The fake project has no Plugin API canvas nodes.");
    },
    setParent: async (nodeId, parentId, index) => {
      state.moves.push({
        nodeId,
        parentId,
        ...(index === undefined ? {} : { index }),
      });
    },
    getCustomCode: async () => state.customCode,
    setCustomCode: async ({ html, location }) => {
      state.customCode[location] = {
        disabled: false,
        html,
      };
    },
    getCodeFiles: async () => state.codeFiles.map(codeFileHandle),
    createCodeFile: async (name, code) => {
      const file = {
        id: nextId("code"),
        name,
        path: name,
        content: code,
      };

      state.codeFiles.push(file);

      return codeFileHandle(file);
    },
    getBranch: async (branchId) =>
      state.branching && branchId === "main"
        ? {
            id: "main",
            title: "Main",
            url: `https://framer.com/projects/Sandbox--${state.project.id}`,
          }
        : null,
  };
}

/** Like Framer: attributes merge, except `breakpoints`, which replaces the whole list. */
function applyTextWrite(style: FakeTextStyle, { path, name, breakpoints, ...attributes }: TextStyleWrite): void {
  // Framer renames a style to its tag's default name when the tag is set (FRAMER_TAG_STYLE_NAMES).
  const newPath = path ?? name ?? (attributes.tag === undefined ? undefined : FRAMER_TAG_STYLE_NAMES[attributes.tag]);

  if (newPath !== undefined) {
    Object.assign(style, stylePath(newPath));
  }

  Object.assign(style, attributes);

  if (breakpoints === undefined) {
    return;
  }

  style.breakpoints = breakpoints
    .map((breakpoint) => ({
      minWidth: breakpoint.minWidth,
      fontSize: breakpoint.fontSize ?? style.fontSize,
      letterSpacing: breakpoint.letterSpacing ?? style.letterSpacing,
      lineHeight: breakpoint.lineHeight ?? style.lineHeight,
      paragraphSpacing: breakpoint.paragraphSpacing ?? style.paragraphSpacing,
    }))
    .sort((a, b) => b.minWidth - a.minWidth);
}
