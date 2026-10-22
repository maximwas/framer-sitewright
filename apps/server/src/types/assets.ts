/** Where an image for image_upload comes from: exactly one of the three. */
export interface ImageSource {
  readonly url?: string | undefined;
  readonly path?: string | undefined;
  readonly svg?: string | undefined;
}

/** Where svg_add takes its markup from: given as is, or an .svg file on this computer. */
export interface SvgSource {
  readonly svg?: string | undefined;
  readonly path?: string | undefined;
}

/** How svg_add sizes the layer: a width in px, and whether the viewBox's empty space stays part of it. */
export interface SvgFit {
  readonly width?: number | undefined;
  readonly keepViewBox?: boolean | undefined;
}

/** Where file_upload takes a file from: an https URL, or a path on this computer. */
export interface FileSource {
  readonly url?: string | undefined;
  readonly path?: string | undefined;
}
