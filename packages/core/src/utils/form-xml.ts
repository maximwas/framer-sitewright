import type { FORM_FIELD_TYPES } from "../constants/forms.ts";

export interface FormFieldSpec {
  readonly name: string;
  readonly label: string;
  readonly type: (typeof FORM_FIELD_TYPES)[number];
  readonly required?: boolean;
  readonly placeholder?: string;
  readonly options?: readonly string[];
}

export interface FormSpec {
  readonly parentId: string;
  readonly name: string;
  readonly button: string;
  readonly fields: readonly FormFieldSpec[];
  readonly labelStyle?: string;
}

function xmlEscape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

function label(text: string, labelStyle: string | undefined): string {
  const style = labelStyle === undefined ? "" : ` textStylePreset="${xmlEscape(labelStyle)}"`;

  return `<RichTextNode name="Label" width="1fr"${style}>${xmlEscape(text)}</RichTextNode>`;
}

function inputOf({ name, type, required, placeholder, options }: FormFieldSpec): string {
  const common = `formInputName="${xmlEscape(name)}" formInputRequired="${required ?? false}"`;

  if (type === "checkbox" || type === "radio") {
    return `<FormBooleanInputNode name="Input" ${common} formBooleanInputType="${type}" />`;
  }

  if (type === "select") {
    // The first option is the placeholder: an empty value that is not disabled, so required still asks for a choice.
    const choices = [placeholder ?? "Choose one", ...(options ?? [])]
      .map(
        (title, index) =>
          ` formSelectOptions.${index}.type="option" formSelectOptions.${index}.value="${index === 0 ? "" : xmlEscape(title)}" formSelectOptions.${index}.title="${xmlEscape(title)}"`,
      )
      .join("");

    return `<FormSelectNode name="Input" ${common} width="1fr"${choices} />`;
  }

  const hint = placeholder === undefined ? "" : ` formInputPlaceholder="${xmlEscape(placeholder)}"`;

  return `<FormPlainTextInputNode name="Input" ${common} formTextInputType="${type}"${hint} width="1fr" />`;
}

/**
 * A native Framer form as design_apply XML: a stack with htmlTag form, a labelled field per spec (a checkbox or radio
 * beside its label), and the submit button as an instance of the given component.
 */
export function formXml({ parentId, name, button, fields, labelStyle }: FormSpec): string {
  const rows = fields.map((field) => {
    const inline = field.type === "checkbox" || field.type === "radio";
    const direction = inline ? "horizontal" : "vertical";
    const alignment = inline ? "center" : "start";
    const parts = inline
      ? [inputOf(field), label(field.label, labelStyle)]
      : [label(field.label, labelStyle), inputOf(field)];

    return [
      `  <FrameNode name="Field/${xmlEscape(field.label)}" htmlTag="label" layout="stack" stackDirection="${direction}" stackAlignment="${alignment}" stackDistribution="start" gap="${inline ? "8px" : "6px"}" width="1fr" height="auto">`,
      ...parts.map((part) => `    ${part}`),
      "  </FrameNode>",
    ].join("\n");
  });

  return [
    `<FrameNode parent="${xmlEscape(parentId)}" key="form" name="${xmlEscape(name)}" htmlTag="form" layout="stack" stackDirection="vertical" stackAlignment="start" stackDistribution="start" gap="16px" width="1fr" height="auto" formSubmitButtonId="@submit">`,
    ...rows,
    `  <ComponentInstanceNode key="submit" name="Submit" component="${xmlEscape(button)}" />`,
    "</FrameNode>",
  ].join("\n");
}
