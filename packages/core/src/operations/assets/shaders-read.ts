import * as z from "zod";
import { requireAgent } from "../../framer/runtime.ts";
import { ShaderEntrySchema } from "../../schemas/assets.ts";
import { countOf } from "../../utils/text.ts";
import { defineOperation } from "../define.ts";

/**
 * Framer's shaders (animated backgrounds placed as a ShaderNode): the ones the site uses and the ones it may add, from
 * the context Framer's own agent starts with, and the controls of those asked for.
 */
export const shadersRead = defineOperation({
  name: "shaders.read",
  effect: "read",
  idempotent: true,
  permissions: [],
  needsAgent: true,
  input: z.strictObject({
    names: z
      .array(z.string().min(1))
      .max(20)
      .exactOptional()
      .describe("Shader names to read the controls of; omit to list every shader."),
  }),
  output: z.object({
    shaders: z.array(
      z.object({
        name: z.string(),
        title: z.string().nullable(),
        keywords: z.string().nullable(),
        /** The site uses it already. */
        onSite: z.boolean(),
        /** Its controls, for the shaders asked for by name. */
        controls: z.unknown(),
      }),
    ),
  }),
  async run({ runtime }, { names }) {
    const agent = requireAgent(runtime);
    const listed = availableShaders(await agent.getContext());
    const wanted = names === undefined ? listed : listed.filter(({ name }) => names.includes(name));
    const controls =
      names === undefined || wanted.length === 0
        ? {}
        : ((await agent.readShaderControls({ shaderNames: wanted.map(({ name }) => name) })) as Record<
            string,
            unknown
          >);

    return {
      shaders: wanted.map((shader) => ({
        ...shader,
        controls: controls[shader.name] ?? null,
      })),
    };
  },
  describe(_input, { shaders }) {
    return { summary: countOf(shaders.length, "shader") };
  },
});

/** The shaders of getContext()'s <available-shaders>: JSON lists under "Current Site Shaders" and "Additionally…". */
function availableShaders(context: string) {
  const tag = /<available-shaders>([\s\S]*?)<\/available-shaders>/.exec(context)?.[1] ?? "";
  const parts = tag.split(/^###\s+/m).filter((part) => part.trim() !== "");

  return parts.flatMap((part) => {
    const onSite = /^current/i.test(part);
    const list = /\[[\s\S]*\]/.exec(part)?.[0];
    let parsed: unknown = [];

    try {
      parsed = list === undefined ? [] : JSON.parse(list);
    } catch {
      parsed = [];
    }

    const entries = z.array(ShaderEntrySchema).safeParse(parsed);

    return entries.success
      ? entries.data.map(({ name, title, keywords }) => ({
          name,
          title: title ?? null,
          keywords: keywords ?? null,
          onSite,
        }))
      : [];
  });
}
