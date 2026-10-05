/** Where an image for image_upload comes from: exactly one of the three. */
export interface ImageSource {
  readonly url?: string | undefined;
  readonly path?: string | undefined;
  readonly svg?: string | undefined;
}

/** Where file_upload takes a file from: an https URL, or an absolute path on this computer. */
export interface FileSource {
  readonly url?: string | undefined;
  readonly path?: string | undefined;
}
