import { FRAMER_TAG_STYLE_NAMES } from "../constants/text-styles.ts";
import type {
  CmsItemHandle,
  CmsItemWrite,
  CodeFileHandle,
  CollectionHandle,
  ColorStyleHandle,
  ComponentData,
  DeploymentData,
  DesignPageData,
  FramerPort,
  PublishInfoData,
  TextStyleHandle,
  TextStyleWrite,
  WebPageData,
} from "../types/framer-port.ts";
import type {
  FakeBreakpoint,
  FakeCollection,
  FakeColorStyle,
  FakeFramerState,
  FakeTextStyle,
} from "../types/testing.ts";
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

  /** A breakpoint frame as the Plugin API reads it: the first is the primary, the others its copies. */
  function breakpointFrame(breakpoint: FakeBreakpoint) {
    const primary = state.breakpoints[0];
    const isPrimary = primary?.id === breakpoint.id;

    return {
      id: breakpoint.id,
      __class: "FrameNode",
      name: breakpoint.name,
      width: `${breakpoint.width}px`,
      isBreakpoint: true,
      isPrimaryBreakpoint: isPrimary,
      isReplica: !isPrimary,
      originalId: isPrimary ? null : (primary?.id ?? null),
    };
  }

  /** A collection as the Plugin API hands it out: fields and items read and written on the fake state. */
  function collectionHandle(collection: FakeCollection): CollectionHandle {
    const itemHandle = (item: FakeCollection["items"][number]): CmsItemHandle => ({
      id: item.id,
      slug: item.slug,
      draft: item.draft,
      fieldData: readFieldData(collection, item.fieldData),
      setAttributes: async ({ slug, draft, fieldData }) => {
        Object.assign(item, {
          ...(slug === undefined ? {} : { slug }),
          ...(draft === undefined ? {} : { draft }),
        });
        assertWritable(collection, fieldData);
        Object.assign(item.fieldData, storedFieldData(fieldData));

        return itemHandle(item);
      },
      remove: async () => {
        collection.items = collection.items.filter((candidate) => candidate.id !== item.id);
      },
    });

    return {
      id: collection.id,
      name: collection.name,
      readonly: collection.readonly,
      managedBy: collection.managedBy,
      getFields: async () => collection.fields.map((field) => ({ ...field })),
      addFields: async (fields) => {
        for (const field of fields) {
          collection.fields.push({
            id: nextId("field"),
            name: field.name,
            type: field.type,
            ...("cases" in field
              ? {
                  cases: field.cases.map((entry) => ({
                    id: nextId("case"),
                    name: entry.name,
                  })),
                }
              : {}),
            ...("collectionId" in field ? { collectionId: field.collectionId } : {}),
          });
        }
      },
      removeFields: async (fieldIds) => {
        collection.fields = collection.fields.filter((field) => !fieldIds.includes(field.id));
      },
      setFieldOrder: async (fieldIds) => {
        collection.fields.sort((a, b) => fieldIds.indexOf(a.id) - fieldIds.indexOf(b.id));
      },
      getItems: async () => collection.items.map(itemHandle),
      addItems: async (items) => {
        // Like Framer: an entry with an id updates that item, one without adds a new one.
        for (const { fieldData } of items) {
          assertWritable(collection, fieldData);
        }

        for (const { id, slug, draft, fieldData } of items) {
          const current = collection.items.find((item) => item.id === id);

          if (current !== undefined) {
            Object.assign(current, draft === undefined ? {} : { draft });
            Object.assign(current.fieldData, storedFieldData(fieldData));
            continue;
          }

          collection.items.push({
            id: nextId("item"),
            slug: slug ?? "",
            draft: draft ?? false,
            fieldData: storedFieldData(fieldData),
          });
        }
      },
      removeItems: async (itemIds) => {
        collection.items = collection.items.filter((item) => !itemIds.includes(item.id));
      },
      setItemOrder: async (itemIds) => {
        collection.items.sort((a, b) => itemIds.indexOf(a.id) - itemIds.indexOf(b.id));
      },
    };
  }

  /** A canvas layer as the Plugin API hands it out: a text layer reads and writes its text. */
  function canvasNode(layer: FakeFramerState["canvas"][number]) {
    return {
      id: layer.id,
      name: layer.name,
      __class: layer.className,
      ...(layer.text === undefined
        ? {}
        : {
            getText: async () => layer.text ?? null,
            setText: async (text: string) => {
              layer.text = text;
            },
          }),
    };
  }

  function structuredPublishInfo(info: PublishInfoData): PublishInfoData {
    return {
      production: info.production === null ? null : { ...info.production },
      staging: info.staging === null ? null : { ...info.staging },
    };
  }

  async function* deploymentsOf(deployments: readonly DeploymentData[]): AsyncIterable<DeploymentData> {
    yield* deployments;
  }

  /** Field values as Framer keeps them: an image or file URL becomes an asset. */
  /** Like Framer, writes take an enum only by its case id and a reference only by an item id. */
  function assertWritable(collection: FakeCollection, fieldData: CmsItemWrite["fieldData"]): void {
    const itemIds = new Set(state.collections.flatMap((candidate) => candidate.items.map(({ id }) => id)));

    for (const [id, entry] of Object.entries(fieldData ?? {})) {
      const field = collection.fields.find((candidate) => candidate.id === id);

      if (entry.type === "enum" && !(field?.cases ?? []).some((option) => option.id === entry.value)) {
        throw new Error(`Expected a valid enum case, got: ${String(entry.value)}, for field: ${field?.name}`);
      }

      if (entry.type === "collectionReference" && entry.value !== null && !itemIds.has(entry.value)) {
        throw new Error(`Bad reference, ID: ${entry.value}, field: ${field?.name}`);
      }
    }
  }

  /**
   * Field values as Framer reads them back: an enum by its case's name and a reference by the item's slug, though
   * writes take ids (Server API, 05.10.2026).
   */
  function readFieldData(
    collection: FakeCollection,
    fieldData: FakeCollection["items"][number]["fieldData"],
  ): FakeCollection["items"][number]["fieldData"] {
    const slugOf = (id: unknown) =>
      state.collections.flatMap((candidate) => candidate.items).find((item) => item.id === id)?.slug ?? id;

    return Object.fromEntries(
      Object.entries(fieldData).map(([id, entry]) => {
        const field = collection.fields.find((candidate) => candidate.id === id);
        let value = entry.value;

        if (entry.type === "enum") {
          value = field?.cases?.find((option) => option.id === entry.value)?.name ?? entry.value;
        } else if (entry.type === "collectionReference") {
          value = slugOf(entry.value);
        } else if (entry.type === "multiCollectionReference" && Array.isArray(entry.value)) {
          value = entry.value.map(slugOf);
        }

        return [
          id,
          {
            type: entry.type,
            value,
          },
        ];
      }),
    );
  }

  function storedFieldData(fieldData: CmsItemWrite["fieldData"]): FakeCollection["items"][number]["fieldData"] {
    return Object.fromEntries(
      Object.entries(fieldData ?? {}).map(([id, entry]) => [
        id,
        (entry.type === "image" || entry.type === "file") && typeof entry.value === "string"
          ? {
              type: entry.type,
              value: {
                url: entry.value,
                altText: "alt" in entry ? entry.alt : undefined,
              },
            }
          : entry,
      ]),
    );
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
    getCollections: async () => state.collections.map(collectionHandle),
    createWebPage: async (path) => {
      const page = {
        id: nextId("page"),
        path,
        draft: false,
        collectionId: null,
      };

      state.webPages.push(page);

      return { ...page };
    },
    createDesignPage: async (name) => {
      const page = {
        id: nextId("design-page"),
        name,
      };

      state.designPages.push(page);

      return { ...page };
    },
    getRedirects: async () => state.redirects.map((redirect) => ({ ...redirect })),
    addRedirects: async (redirects) => {
      const written = redirects.map((write) => {
        if ("id" in write) {
          const current = state.redirects.find((redirect) => redirect.id === write.id);

          if (current === undefined) {
            throw new Error(`No redirect ${write.id}.`);
          }

          Object.assign(current, {
            ...(write.from === undefined ? {} : { from: write.from }),
            ...(write.to === undefined ? {} : { to: write.to }),
            ...(write.expandToAllLocales === undefined ? {} : { expandToAllLocales: write.expandToAllLocales }),
          });

          return { ...current };
        }

        const created = {
          id: nextId("redirect"),
          ...write,
        };

        state.redirects.push(created);

        return { ...created };
      });

      return written;
    },
    removeRedirects: async (ids) => {
      state.redirects = state.redirects.filter((redirect) => !ids.includes(redirect.id));
    },
    setRedirectOrder: async (ids) => {
      state.redirects.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    },
    getPublishInfo: async () => structuredPublishInfo(state.publishInfo),
    getUnpublishedPageChanges: async () => state.unpublishedChanges.map((change) => ({ ...change })),
    listDeployments: (limit) => deploymentsOf(state.deployments.slice(0, limit)),
    getLocales: async () => state.locales.map((locale) => ({ ...locale })),
    getDefaultLocale: async () => ({ ...state.defaultLocale }),
    getLocalizationGroups: async () =>
      JSON.parse(JSON.stringify(state.localizationGroups)) as FakeFramerState["localizationGroups"],
    setLocalizationData: async ({ valuesBySource = {}, statusByLocaleByGroup = {} }) => {
      const errors: { sourceId: string; localeId: string | null; error: string }[] = [];
      const sources = state.localizationGroups.flatMap((group) => group.sources);

      for (const [sourceId, byLocale] of Object.entries(valuesBySource)) {
        const source = sources.find(({ id }) => id === sourceId);

        if (source === undefined) {
          errors.push({
            sourceId,
            localeId: null,
            error: "Unknown source",
          });
          continue;
        }

        for (const [localeId, update] of Object.entries(byLocale)) {
          if (update.action === "clear") {
            delete source.valueByLocale[localeId];
          } else {
            source.valueByLocale[localeId] = {
              value: update.value,
              status: update.needsReview ? "needsReview" : "done",
            };
          }
        }
      }

      for (const [groupId, byLocale] of Object.entries(statusByLocaleByGroup)) {
        const group = state.localizationGroups.find(({ id }) => id === groupId);

        Object.assign(group?.statusByLocale ?? {}, byLocale);
      }

      return {
        valuesBySource: { errors },
        statusByLocaleByGroup: { errors: [] },
      };
    },
    createCollection: async (name) => {
      const collection: FakeCollection = {
        id: nextId("collection"),
        name,
        readonly: false,
        managedBy: "user",
        fields: [],
        items: [],
      };

      state.collections.push(collection);

      return collectionHandle(collection);
    },
    getChildren: async (nodeId) => [
      ...(state.webPages.find((page) => page.id === nodeId)?.path === "/"
        ? state.breakpoints.map(breakpointFrame)
        : []),
      ...state.canvas.filter((layer) => layer.parentId === nodeId).map(canvasNode),
    ],
    removeNodes: async (nodeIds) => {
      state.webPages = state.webPages.filter((page) => !nodeIds.includes(page.id));
      state.designPages = state.designPages.filter((page) => !nodeIds.includes(page.id));
      state.breakpoints = state.breakpoints.filter((breakpoint) => !nodeIds.includes(breakpoint.id));
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
    uploadFile: async ({ file, name }) => {
      const id = nextId("file");
      const extension =
        typeof file === "string" ? (/\.(\w+)(?:\?|$)/.exec(file)?.[1] ?? null) : (file.mimeType.split("/")[1] ?? null);

      state.uploadedFiles.push({
        id,
        source: file,
        name: name ?? null,
      });

      return {
        id,
        url: `https://framerusercontent.com/assets/${id}${extension === null ? "" : `.${extension}`}`,
        extension,
      };
    },
    addSVG: async ({ svg }) => {
      state.svgs.push(svg);
      // Like the editor, select what was inserted.
      state.selection = [nextId("svg")];
    },
    addComponentInstance: async ({ url, parentId }) => {
      const id = nextId("instance");

      state.instances.push({
        id,
        url,
        ...(parentId === undefined ? {} : { parentId }),
      });

      return {
        id,
        name: null,
      };
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
      const page = state.webPages.find((candidate) => candidate.id === nodeId);
      const breakpoint = state.breakpoints.find((candidate) => candidate.id === nodeId);
      const controls = state.instanceControls[nodeId];

      if (page !== undefined) {
        return {
          ...page,
          __class: "WebPageNode",
          addBreakpoint: async (basedOn: string, { name, width }: { name: string; width: number }) => {
            const added = {
              id: nextId("breakpoint"),
              name,
              width,
            };

            // Like Framer: a copy of the breakpoint it is based on.
            if (!state.breakpoints.some((candidate) => candidate.id === basedOn)) {
              throw new Error(`No breakpoint ${basedOn} to copy.`);
            }

            state.breakpoints.push(added);

            return breakpointFrame(added);
          },
        };
      }

      if (breakpoint !== undefined) {
        return breakpointFrame(breakpoint);
      }

      const layer = state.canvas.find((candidate) => candidate.id === nodeId);

      if (layer !== undefined) {
        return canvasNode(layer);
      }

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
    // The fake project's canvas is the home page's breakpoints; other node work goes through the fake framer.agent.
    getParent: async (nodeId) => {
      if (state.breakpoints.some((breakpoint) => breakpoint.id === nodeId)) {
        return state.webPages.find((page) => page.path === "/") ?? null;
      }

      const parentId = state.canvas.find((layer) => layer.id === nodeId)?.parentId;
      const breakpoint = state.breakpoints.find((candidate) => candidate.id === parentId);
      const layer = state.canvas.find((candidate) => candidate.id === parentId);

      if (breakpoint !== undefined) {
        return breakpointFrame(breakpoint);
      }

      return layer === undefined ? null : canvasNode(layer);
    },
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
