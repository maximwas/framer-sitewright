import * as z from "zod";

/** One stock image from framer.agent.queryImages. */
const ImageCandidateSchema = z.looseObject({
  url: z.string(),
  alt: z.string().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  color: z.string().nullish(),
});

/** queryImages answers with `{ source, query, results }` (30.09.2026); a bare list or `{ images }` is taken too. */
export const ImageCandidatesSchema = z.union([
  z.array(ImageCandidateSchema),
  z.looseObject({ results: z.array(ImageCandidateSchema) }).transform(({ results }) => results),
  z.looseObject({ images: z.array(ImageCandidateSchema) }).transform(({ images }) => images),
]);

const CatalogEntrySchema = z.looseObject({
  id: z.string(),
  displayName: z.string(),
});

export const IconSetCatalogSchema = z.looseObject({
  project: z.array(CatalogEntrySchema).default([]),
  external: z.array(CatalogEntrySchema).default([]),
  additional: z.array(CatalogEntrySchema).default([]),
});

export const IconNamesSchema = z.array(z.string());

/** Controls by id; an id Framer does not know maps to `{ error }`. */
export const ControlsByIdSchema = z.record(z.string(), z.unknown());

export const ComponentCatalogSchema = z.looseObject({
  project: z
    .looseObject({
      canvas: z.array(CatalogEntrySchema).default([]),
      code: z.record(z.string(), z.unknown()).default({}),
    })
    .default({
      canvas: [],
      code: {},
    }),
});

/** One component's controls as readComponentControls answers: `{ controls: { $control__icon: { type, set } } }`. */
export const ComponentControlsSchema = z.looseObject({
  controls: z
    .record(
      z.string(),
      z.looseObject({
        type: z.string().optional(),
        set: z.string().optional(),
      }),
    )
    .default({}),
});

/** The components one code file declares, as listComponents lists them under `project.code[<file path>]`. */
export const CodeComponentEntriesSchema = z.array(
  z.looseObject({
    id: z.string(),
    displayName: z.string().optional(),
    name: z.string().optional(),
  }),
);
