/** The site's own pieces a section is built from: text styles by role, tokens by role (ids). */
export interface SectionLook {
  readonly heading?: string | undefined;
  readonly body?: string | undefined;
  readonly ink?: string | undefined;
  readonly muted?: string | undefined;
  readonly surface?: string | undefined;
  readonly accent?: string | undefined;
  readonly onAccent?: string | undefined;
  readonly maxWidth: string;
}

export interface SectionSpec {
  readonly kind: "hero" | "cta" | "features";
  readonly parentId: string;
  readonly index?: number;
  readonly heading: string;
  readonly text?: string;
  readonly button?: { readonly label: string; readonly link: string };
  readonly items?: readonly { readonly title: string; readonly text: string }[];
}

function xmlText(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

const token = (id: string | undefined) => (id === undefined ? "" : `var(--token-${id})`);

function textNode(
  name: string,
  text: string,
  style: string | undefined,
  color: string | undefined,
  width = "1fr",
): string {
  const attributes = [
    `name="${name}"`,
    `width="${width}"`,
    ...(style === undefined ? [] : [`textStylePreset="${xmlText(style)}"`]),
    ...(color === undefined ? [] : [`textColor="${token(color)}"`]),
  ].join(" ");

  return `<RichTextNode ${attributes}>${xmlText(text)}</RichTextNode>`;
}

function buttonNode({ label, link }: NonNullable<SectionSpec["button"]>, look: SectionLook): string {
  const fill = look.accent === undefined ? "" : ` fill="${token(look.accent)}"`;

  return [
    `<FrameNode name="Button" link="${xmlText(link)}" layout="stack" stackDirection="horizontal" stackAlignment="center" stackDistribution="center" padding="14px 24px" radius="999px" width="auto" height="auto"${fill}>`,
    `  ${textNode("Label", label, look.body, look.onAccent, "auto")}`,
    "</FrameNode>",
  ].join("\n");
}

/**
 * A section in the site's own system as design_apply XML: Section, a Container on the site's content width, then the
 * content. Every stack names its alignment and distribution; nothing is centered but the closing call to action.
 */
export function sectionXml(spec: SectionSpec, look: SectionLook): string {
  const centered = spec.kind === "cta";
  const align = centered ? "center" : "start";
  const intro = [
    textNode("Heading", spec.heading, look.heading, look.ink),
    ...(spec.text === undefined ? [] : [textNode("Text", spec.text, look.body, look.muted ?? look.ink)]),
    ...(spec.button === undefined ? [] : [buttonNode(spec.button, look)]),
  ];
  const cards =
    spec.kind === "features"
      ? [
          `<FrameNode name="Grid" layout="grid" gridColumnCount="3" gridRowHeightType="auto" gap="24px" width="1fr" height="auto">`,
          ...(spec.items ?? []).map((item) =>
            [
              `  <FrameNode name="Card" layout="stack" stackDirection="vertical" stackAlignment="start" stackDistribution="start" gap="12px" padding="32px" radius="16px" width="1fr" height="1fr"${look.surface === undefined ? "" : ` fill="${token(look.surface)}"`}>`,
              `    ${textNode("Title", item.title, look.heading, look.ink)}`,
              `    ${textNode("Text", item.text, look.body, look.muted ?? look.ink)}`,
              "  </FrameNode>",
            ].join("\n"),
          ),
          "</FrameNode>",
        ]
      : [];
  const index = spec.index === undefined ? "" : ` index="${spec.index}"`;

  return [
    `<FrameNode parent="${xmlText(spec.parentId)}" key="section"${index} name="${spec.kind === "cta" ? "CTA" : spec.kind === "hero" ? "Hero" : "Features"}" layout="stack" stackDirection="vertical" stackAlignment="center" stackDistribution="start" padding="96px 0px" width="1fr" height="auto">`,
    `  <FrameNode name="Container" layout="stack" stackDirection="vertical" stackAlignment="${align}" stackDistribution="start" gap="48px" padding="0px 40px" width="1fr" maxWidth="${look.maxWidth}" height="auto">`,
    `    <FrameNode name="Content" layout="stack" stackDirection="vertical" stackAlignment="${align}" stackDistribution="start" gap="24px" width="1fr" maxWidth="720px" height="auto">`,
    ...intro.map((part) => part.replace(/^/gm, "      ")),
    "    </FrameNode>",
    ...cards.map((part) => part.replace(/^/gm, "    ")),
    "  </FrameNode>",
    "</FrameNode>",
  ].join("\n");
}
