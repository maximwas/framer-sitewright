/** Where an image for image_upload comes from: exactly one of the three. */
export interface ImageSource {
  readonly url?: string | undefined;
  readonly path?: string | undefined;
  readonly svg?: string | undefined;
}
