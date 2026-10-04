export interface DocSection {
  readonly id: string;
  readonly title: string;
  readonly level: number;
  readonly parents: readonly string[];
  readonly content: string;
}

export interface SectionMatch {
  readonly id: string;
  readonly title: string;
  readonly level: number;
  readonly snippet: string;
}

export interface Heading {
  readonly index: number;
  readonly level: number;
  readonly title: string;
}
