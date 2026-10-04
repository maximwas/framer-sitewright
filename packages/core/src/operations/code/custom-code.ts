import * as z from "zod";
import { CUSTOM_CODE_LOCATIONS } from "../../constants/assets.ts";
import { defineOperation } from "../define.ts";

export const customCodeGet = defineOperation({
  name: "customCode.get",
  effect: "read",
  idempotent: true,
  permissions: [],
  input: z.strictObject({}),
  output: z.object({
    locations: z.array(
      z.object({
        location: z.enum(CUSTOM_CODE_LOCATIONS),
        html: z.string().nullable(),
        disabled: z.boolean(),
      }),
    ),
  }),
  async run({ runtime }) {
    const code = await runtime.port.getCustomCode();

    return {
      locations: CUSTOM_CODE_LOCATIONS.map((location) => ({
        location,
        html: code[location].html,
        disabled: code[location].disabled,
      })),
    };
  },
  describe(_input, { locations }) {
    const used = locations.filter(({ html }) => html !== null).map(({ location }) => location);

    return { summary: used.length === 0 ? "No custom code" : `Code in ${used.join(", ")}` };
  },
});

export const customCodeSet = defineOperation({
  name: "customCode.set",
  effect: "destructive",
  idempotent: true,
  permissions: ["setCustomCode"],
  input: z.strictObject({
    location: z.enum(CUSTOM_CODE_LOCATIONS),
    html: z.string().nullable().describe("The HTML for this location on every page; null removes it."),
  }),
  output: z.object({
    location: z.enum(CUSTOM_CODE_LOCATIONS),
    previous: z.string().nullable(),
  }),
  async run({ runtime }, { location, html }) {
    const previous = (await runtime.port.getCustomCode())[location].html;

    await runtime.port.setCustomCode({
      html,
      location,
    });

    return {
      location,
      previous,
    };
  },
  describe({ location, html }) {
    return {
      subject: location,
      summary: html === null ? "Removed" : null,
    };
  },
});
