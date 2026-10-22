/** A font as a design gives it: what tokens_match compares text styles with; sizes in px. */
export interface FontSpec {
  readonly family?: string | undefined;
  readonly weight?: number | undefined;
  readonly size: number;
  readonly lineHeight?: number | undefined;
  readonly letterSpacing?: number | undefined;
}

/** One slot of a text style in px: its size, and its line height and letter spacing when they convert. */
export interface SlotSize {
  readonly size: number;
  readonly lineHeight: number | null;
  readonly letterSpacing: number | null;
}
