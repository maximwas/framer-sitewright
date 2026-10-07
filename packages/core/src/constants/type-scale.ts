/** The roles generateTypeScale writes: steps up or down the ratio from the body size, with line height and tracking. */
export const TYPE_SCALE_ROLES = [
  {
    path: "Display",
    tag: "h1",
    step: 6,
    lineHeight: "1em",
    letterSpacing: "-0.04em",
    heading: true,
  },
  {
    path: "Heading/L",
    tag: "h2",
    step: 4,
    lineHeight: "1.05em",
    letterSpacing: "-0.03em",
    heading: true,
  },
  {
    path: "Heading/M",
    tag: "h3",
    step: 3,
    lineHeight: "1.1em",
    letterSpacing: "-0.02em",
    heading: true,
  },
  {
    path: "Heading/S",
    tag: "h4",
    step: 2,
    lineHeight: "1.2em",
    letterSpacing: "-0.01em",
    heading: true,
  },
  {
    path: "Heading/XS",
    tag: "h5",
    step: 1,
    lineHeight: "1.3em",
    letterSpacing: "0em",
    heading: true,
  },
  {
    path: "Body/Default",
    tag: "p",
    step: 0,
    lineHeight: "1.5em",
    letterSpacing: "0em",
    heading: false,
  },
  {
    path: "Body/Caption",
    tag: "p",
    step: -1,
    lineHeight: "1.4em",
    letterSpacing: "0.01em",
    heading: false,
  },
] as const;

/** Named ratios, the way type scales are usually picked. */
export const TYPE_SCALE_RATIOS = {
  minorThird: 1.2,
  majorThird: 1.25,
  perfectFourth: 1.333,
  augmentedFourth: 1.414,
  perfectFifth: 1.5,
  goldenRatio: 1.618,
} as const;

/** The moods the font tools sort by. */
export const FONT_MOODS = [
  "editorial",
  "modern",
  "bold",
  "technical",
  "playful",
  "luxury",
  "warm",
  "minimal",
  "developer",
  "fashion",
] as const;

/** Heading and body pairs that work together, all on Google Fonts (in Framer's library), with their character. */
export const FONT_PAIRINGS = [
  {
    heading: "Fraunces",
    body: "Inter",
    moods: ["editorial", "warm"],
    contrast: "high",
  },
  {
    heading: "Newsreader",
    body: "Archivo",
    moods: ["editorial", "warm"],
    contrast: "high",
  },
  {
    heading: "Playfair Display",
    body: "Source Sans 3",
    moods: ["editorial", "luxury"],
    contrast: "high",
  },
  {
    heading: "Cormorant Garamond",
    body: "Montserrat",
    moods: ["luxury", "fashion"],
    contrast: "high",
  },
  {
    heading: "DM Serif Display",
    body: "DM Sans",
    moods: ["editorial", "modern"],
    contrast: "high",
  },
  {
    heading: "Instrument Serif",
    body: "Inter Tight",
    moods: ["fashion", "minimal"],
    contrast: "high",
  },
  {
    heading: "Space Grotesk",
    body: "Inter",
    moods: ["technical", "modern"],
    contrast: "medium",
  },
  {
    heading: "Archivo",
    body: "Archivo",
    moods: ["bold", "modern"],
    contrast: "subtle",
  },
  {
    heading: "Bricolage Grotesque",
    body: "Inter",
    moods: ["playful", "modern"],
    contrast: "medium",
  },
  {
    heading: "Syne",
    body: "Manrope",
    moods: ["bold", "fashion"],
    contrast: "medium",
  },
  {
    heading: "Unbounded",
    body: "Inter",
    moods: ["bold", "playful"],
    contrast: "medium",
  },
  {
    heading: "Manrope",
    body: "Manrope",
    moods: ["minimal", "modern"],
    contrast: "subtle",
  },
  {
    heading: "IBM Plex Sans",
    body: "IBM Plex Mono",
    moods: ["technical", "developer"],
    contrast: "medium",
  },
  {
    heading: "JetBrains Mono",
    body: "Inter",
    moods: ["developer", "technical"],
    contrast: "medium",
  },
  {
    heading: "Sora",
    body: "Inter",
    moods: ["modern", "minimal"],
    contrast: "subtle",
  },
  {
    heading: "Lora",
    body: "Work Sans",
    moods: ["warm", "editorial"],
    contrast: "medium",
  },
] as const;

/** Families by mood, with the role each plays best and the weights to start from. */
export const FONTS_BY_MOOD = [
  {
    family: "Fraunces",
    moods: ["editorial", "warm"],
    role: "heading",
    weights: [400, 600],
  },
  {
    family: "Newsreader",
    moods: ["editorial", "warm"],
    role: "both",
    weights: [400, 500],
  },
  {
    family: "Playfair Display",
    moods: ["editorial", "luxury"],
    role: "heading",
    weights: [500, 700],
  },
  {
    family: "Cormorant Garamond",
    moods: ["luxury", "fashion"],
    role: "heading",
    weights: [500, 600],
  },
  {
    family: "Instrument Serif",
    moods: ["fashion", "minimal"],
    role: "heading",
    weights: [400],
  },
  {
    family: "DM Serif Display",
    moods: ["editorial"],
    role: "heading",
    weights: [400],
  },
  {
    family: "Lora",
    moods: ["warm", "editorial"],
    role: "both",
    weights: [400, 600],
  },
  {
    family: "Inter",
    moods: ["modern", "minimal", "technical"],
    role: "body",
    weights: [400, 500, 600],
  },
  {
    family: "Inter Tight",
    moods: ["modern", "minimal"],
    role: "heading",
    weights: [500, 600],
  },
  {
    family: "Archivo",
    moods: ["bold", "modern"],
    role: "both",
    weights: [400, 600, 800],
  },
  {
    family: "Space Grotesk",
    moods: ["technical", "modern"],
    role: "heading",
    weights: [500, 700],
  },
  {
    family: "Bricolage Grotesque",
    moods: ["playful", "modern"],
    role: "heading",
    weights: [500, 700],
  },
  {
    family: "Syne",
    moods: ["bold", "fashion"],
    role: "heading",
    weights: [600, 800],
  },
  {
    family: "Unbounded",
    moods: ["bold", "playful"],
    role: "heading",
    weights: [500, 700],
  },
  {
    family: "Manrope",
    moods: ["minimal", "modern"],
    role: "both",
    weights: [400, 600],
  },
  {
    family: "DM Sans",
    moods: ["modern", "minimal"],
    role: "body",
    weights: [400, 500],
  },
  {
    family: "Work Sans",
    moods: ["warm", "minimal"],
    role: "body",
    weights: [400, 500],
  },
  {
    family: "Source Sans 3",
    moods: ["minimal", "editorial"],
    role: "body",
    weights: [400, 600],
  },
  {
    family: "Montserrat",
    moods: ["luxury", "modern"],
    role: "body",
    weights: [400, 500],
  },
  {
    family: "Sora",
    moods: ["modern", "technical"],
    role: "both",
    weights: [400, 600],
  },
  {
    family: "IBM Plex Sans",
    moods: ["technical", "developer"],
    role: "both",
    weights: [400, 500],
  },
  {
    family: "IBM Plex Mono",
    moods: ["developer", "technical"],
    role: "body",
    weights: [400, 500],
  },
  {
    family: "JetBrains Mono",
    moods: ["developer"],
    role: "both",
    weights: [400, 600],
  },
  {
    family: "Caveat",
    moods: ["playful", "warm"],
    role: "heading",
    weights: [500, 700],
  },
] as const;
