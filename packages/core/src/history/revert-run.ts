import { PluginNodeRevert } from "../plugin-nodes/revert.ts";
import { clearBreakpoints } from "../styles/clear-breakpoints.ts";
import type { FramerRuntime } from "../types/framer.ts";
import type { ColorStyleHandle, FontData, TextStyleFields, TextStyleHandle } from "../types/framer-port.ts";
import type {
  ColorEntry,
  ColorStep,
  ColorStyleState,
  RevertOptions,
  RevertOutcome,
  RevertResult,
  StepSegment,
  StyleStep,
  TextEntry,
  TextStep,
  TextStyleState,
  UndoStep,
  WorkingEntry,
} from "../types/history.ts";
import { labelOf } from "./activity.ts";
import { applyAliases } from "./aliases.ts";
import { NodeRevertRun } from "./dsl/node-revert-run.ts";
import { decide } from "./revert-decision.ts";
import { colorStyleState, textStyleState } from "./style-states.ts";

/**
 * Undoes steps newest first. Each step is decided against the items as the earlier steps left them, so an item
 * recreated by one step is found, under its new id, by the next. Styles go one at a time through the Plugin API;
 * canvas nodes go in DSL batches (NodeRevertRun). A dry run changes nothing in Framer but walks the same path on its
 * own copy of the items.
 */
export class RevertRun {
  readonly #runtime: FramerRuntime;
  readonly #options: RevertOptions;
  readonly #colors: ColorEntry[];
  readonly #texts: TextEntry[];
  readonly #remap = new Map<string, string>();
  readonly #nodes: NodeRevertRun | PluginNodeRevert;
  /** Font handles by family, weight and style: many text styles share a font, and each lookup is a Framer call. */
  readonly #fonts = new Map<string, Promise<FontData | null>>();

  constructor(
    runtime: FramerRuntime,
    current: { readonly colors: readonly ColorStyleHandle[]; readonly texts: readonly TextStyleHandle[] },
    options: RevertOptions,
  ) {
    this.#runtime = runtime;
    this.#options = options;
    this.#colors = current.colors.map((handle) => entry(handle, colorStyleState(handle)));
    this.#texts = current.texts.map((handle) => entry(handle, textStyleState(handle)));
    // Without framer.agent (no Server API key) node steps go back through the Plugin API.
    this.#nodes =
      runtime.agent === null
        ? new PluginNodeRevert(runtime, options, this.#remap)
        : new NodeRevertRun(runtime, options, this.#remap);
  }

  /** Reverts every step, newest first. Node steps go through the DSL, or without framer.agent the Plugin API. */
  async revertAll(steps: readonly UndoStep[]): Promise<RevertResult[]> {
    const results: RevertResult[] = [];

    for (const segment of segmentsNewestFirst(steps)) {
      if (segment.kind === "node") {
        results.push(...(await this.#nodes.revert(segment.steps)));
      } else {
        for (const step of segment.steps) {
          results.push(await this.#revert(step));
        }
      }
    }

    return results;
  }

  async #revert(original: StyleStep): Promise<RevertResult> {
    const [step = original] = applyAliases([original], this.#remap) as StyleStep[];
    const outcome = step.kind === "color-style" ? await this.#revertColor(step) : await this.#revertText(step);

    return {
      kind: original.kind,
      id: original.id,
      path: labelOf(original),
      outcome,
      newId: this.#remap.get(original.id) ?? null,
      note: null,
    };
  }

  async #revertColor(step: ColorStep): Promise<RevertOutcome> {
    const decision = decide(step, this.#colors, this.#options.force);

    if (decision.outcome === "deleted") {
      const handle = decision.target.handle;

      await this.#write(async () => handle?.remove());
      remove(this.#colors, decision.target);
    } else if (decision.outcome === "restored" && step.before !== null) {
      const state = step.before;
      const handle = decision.target.handle;

      await this.#write(async () => handle?.setAttributes(colorAttributes(state)));
      decision.target.state = state;
    } else if (decision.outcome === "recreated" && step.before !== null) {
      const state = step.before;
      const handle = await this.#write(() =>
        this.#runtime.port.createColorStyle({
          path: state.path,
          ...colorAttributes(state),
        }),
      );

      this.#colors.push(this.#recreated(step.id, handle, state));
    }

    return decision.outcome;
  }

  async #revertText(step: TextStep): Promise<RevertOutcome> {
    const decision = decide(step, this.#texts, this.#options.force);

    if (decision.outcome === "deleted") {
      const handle = decision.target.handle;

      await this.#write(async () => {
        if (handle !== null) {
          await clearBreakpoints(handle);
          await handle.remove();
        }
      });
      remove(this.#texts, decision.target);
    } else if (decision.outcome === "restored" && step.before !== null) {
      const state = step.before;

      await this.#write(async () => {
        const restored = await decision.target.handle?.setAttributes(await this.#textAttributes(state));

        // Setting the tag renames the style to the tag's default name (FRAMER_TAG_STYLE_NAMES): name it back.
        return restored?.setAttributes({ name: state.path });
      });
      decision.target.state = state;
    } else if (decision.outcome === "recreated" && step.before !== null) {
      const state = step.before;
      const handle = await this.#write(async () =>
        this.#runtime.port.createTextStyle({
          path: state.path,
          ...(await this.#textAttributes(state)),
        }),
      );

      this.#texts.push(this.#recreated(step.id, handle, state));
    }

    return decision.outcome;
  }

  /** Runs a Framer write, or skips it on a dry run. */
  async #write<T>(write: () => Promise<T>): Promise<T | null> {
    return this.#options.dryRun ? null : write();
  }

  /** Tracks a recreated item under its new id (a placeholder id on a dry run) and maps the old id to it. */
  #recreated<State extends { readonly path: string }, Handle extends { readonly id: string }>(
    oldId: string,
    handle: Handle | null,
    state: State,
  ): WorkingEntry<State, Handle> {
    const id = handle?.id ?? `dry-run:${oldId}`;

    this.#remap.set(oldId, id);

    if (handle !== null) {
      this.#options.history?.recordRemap(oldId, id);
    }

    return {
      id,
      path: state.path,
      state,
      handle,
    };
  }

  /**
   * Plugin API attributes that bring a text style back to `state`, re-binding its colour token if it was recreated. The
   * token comes from the run's own list, which already holds the tokens it recreated.
   */
  async #textAttributes(state: TextStyleState): Promise<TextStyleFields> {
    const tokenId = state.color.tokenId === null ? null : (this.#remap.get(state.color.tokenId) ?? state.color.tokenId);
    const token = this.#colors.find((candidate) => candidate.id === tokenId)?.handle ?? null;
    const font = await this.#font(state.font);
    const color = token ?? state.color.value;

    return {
      tag: state.tag,
      ...(font === null ? {} : { font }),
      ...(color === null ? {} : { color }),
      fontSize: state.fontSize,
      lineHeight: state.lineHeight,
      letterSpacing: state.letterSpacing,
      paragraphSpacing: state.paragraphSpacing,
      transform: state.transform,
      alignment: state.alignment,
      decoration: state.decoration,
      minWidth: state.minWidth,
      breakpoints: state.breakpoints,
    };
  }

  #font({ family, weight, style }: TextStyleState["font"]): Promise<FontData | null> {
    const key = `${family}|${weight ?? ""}|${style ?? ""}`;
    let font = this.#fonts.get(key);

    if (font === undefined) {
      font = this.#runtime.port.getFont(family, {
        ...(weight === null ? {} : { weight }),
        ...(style === null ? {} : { style }),
      });
      this.#fonts.set(key, font);
    }

    return font;
  }
}

/** Runs of style steps and node steps, newest first: each run goes through its own writer, in order. */
function segmentsNewestFirst(steps: readonly UndoStep[]): StepSegment[] {
  const segments: StepSegment[] = [];

  for (const step of [...steps].reverse()) {
    const last = segments.at(-1);

    if (step.kind === "node") {
      if (last?.kind === "node") {
        last.steps.push(step);
      } else {
        segments.push({
          kind: "node",
          steps: [step],
        });
      }
    } else if (last?.kind === "style") {
      last.steps.push(step);
    } else {
      segments.push({
        kind: "style",
        steps: [step],
      });
    }
  }

  return segments;
}

function entry<State extends { readonly path: string }, Handle extends { readonly id: string }>(
  handle: Handle,
  state: State,
): WorkingEntry<State, Handle> {
  return {
    id: handle.id,
    path: state.path,
    state,
    handle,
  };
}

function remove<Entry>(entries: Entry[], target: Entry): void {
  entries.splice(entries.indexOf(target), 1);
}

function colorAttributes(state: ColorStyleState): { light: string; dark: string | null } {
  return {
    light: state.light,
    dark: state.dark,
  };
}
