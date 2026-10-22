import { readFile, realpath, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { OperationError } from "@sitewright/core";
import { optimize, type XastElement, type XastRoot } from "svgo";
import { IMAGE_UPLOAD_MAX_BYTES } from "../constants/assets.ts";
import type { SvgFit, SvgSource } from "../types/assets.ts";

/** SVG markup as given, or read from an .svg file; a relative path is taken from the folder the server runs in. */
export async function svgMarkupOf({ svg, path }: SvgSource): Promise<string> {
  if ((svg === undefined) === (path === undefined)) {
    throw new OperationError("INVALID_INPUT", "Pass exactly one of svg or path.");
  }

  if (svg !== undefined) {
    return svg;
  }

  const notAnSvg = () =>
    new OperationError(
      "INVALID_INPUT",
      `"${path}" is not a path to an SVG file.`,
      `Use a path ending in .svg, absolute or relative to ${process.cwd()}.`,
    );
  const real = await realpath(resolve(path ?? "")).catch(() => {
    throw notAnSvg();
  });

  if (extname(real).toLowerCase() !== ".svg") {
    throw notAnSvg();
  }

  if ((await stat(real)).size > IMAGE_UPLOAD_MAX_BYTES) {
    throw new OperationError("INVALID_INPUT", `"${path}" is over ${IMAGE_UPLOAD_MAX_BYTES / 1024 / 1024} MB.`);
  }

  const markup = await readFile(real, "utf8");

  if (!/<svg\b/i.test(markup)) {
    throw notAnSvg();
  }

  return markup;
}

/**
 * The markup sized and framed for Framer's addSVG, which sizes the layer by the root's width and height and crops it to
 * the drawing (seen 22.10.2026): `width` sets the root's width and a height in the viewBox's ratio; `keepViewBox` adds
 * an unpainted rect over the whole viewBox, so the empty space around the drawing stays part of the layer.
 */
export function fitSvg(svg: string, { width, keepViewBox }: SvgFit): string {
  if (width === undefined && keepViewBox !== true) {
    return svg;
  }

  let problem: string | null = null;
  const { data } = optimize(svg, {
    plugins: [
      {
        name: "sitewright-fit",
        fn: (root: XastRoot) => {
          const element = root.children.find(
            (child): child is XastElement => child.type === "element" && child.name === "svg",
          );
          const box = element === undefined ? null : boxOf(element);

          if (element === undefined || box === null) {
            problem = "The SVG needs a viewBox, or a width and height in px, to be sized or keep its frame.";

            return null;
          }

          if (width !== undefined) {
            element.attributes.width = String(width);
            element.attributes.height = String(Math.round((width * box.height * 100) / box.width) / 100);
          }

          if (keepViewBox === true) {
            element.children.unshift({
              type: "element",
              name: "rect",
              attributes: {
                x: String(box.x),
                y: String(box.y),
                width: String(box.width),
                height: String(box.height),
                fill: "none",
              },
              children: [],
            });
          }

          return null;
        },
      },
    ],
  });

  if (problem !== null) {
    throw new OperationError("INVALID_INPUT", problem);
  }

  return data;
}

/** The drawing's frame: the viewBox, or 0 0 width height when the root has only px sizes. */
function boxOf({ attributes }: XastElement): { x: number; y: number; width: number; height: number } | null {
  const [x, y, width, height] = (attributes.viewBox ?? "")
    .trim()
    .split(/[\s,]+/)
    .map(Number);

  if (x !== undefined && y !== undefined && width !== undefined && height !== undefined && width > 0 && height > 0) {
    return {
      x,
      y,
      width,
      height,
    };
  }

  const pxWidth = pxOf(attributes.width);
  const pxHeight = pxOf(attributes.height);

  return pxWidth === null || pxHeight === null
    ? null
    : {
        x: 0,
        y: 0,
        width: pxWidth,
        height: pxHeight,
      };
}

function pxOf(value: string | undefined): number | null {
  const match = /^\s*(\d+(?:\.\d+)?)(px)?\s*$/.exec(value ?? "");

  return match?.[1] === undefined ? null : Number(match[1]);
}
