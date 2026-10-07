/** The field types form_add builds: Framer's text input types, a select, and checkbox or radio. */
export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "tel",
  "number",
  "url",
  "date",
  "time",
  "select",
  "checkbox",
  "radio",
] as const;

/** How many fields one form_add builds. */
export const FORM_FIELDS_MAX = 30;
