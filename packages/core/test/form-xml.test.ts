import { expect, it } from "vitest";
import { formXml } from "../src/utils/form-xml.ts";

it("builds a native form: labelled inputs, a select whose first option is an empty placeholder, a checkbox beside its label", () => {
  const xml = formXml({
    parentId: "contact",
    name: "Contact form",
    button: "btn1",
    fields: [
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        placeholder: "you@company.com",
      },
      {
        name: "size",
        label: "Team size",
        type: "select",
        options: ["1–20", "21–200"],
      },
      {
        name: "consent",
        label: "I agree to the privacy policy",
        type: "checkbox",
        required: true,
      },
    ],
  });

  expect(xml).toContain('htmlTag="form"');
  expect(xml).toContain('formSubmitButtonId="@submit"');
  expect(xml).toContain(
    '<FormPlainTextInputNode name="Input" formInputName="email" formInputRequired="true" formTextInputType="email" formInputPlaceholder="you@company.com" width="1fr" />',
  );
  expect(xml).toContain('formSelectOptions.0.value="" formSelectOptions.0.title="Choose one"');
  expect(xml).toContain('formSelectOptions.2.value="21–200"');
  expect(xml).toMatch(/<FormBooleanInputNode[^>]*formBooleanInputType="checkbox" \/>\n\s+<RichTextNode name="Label"/);
  expect(xml).toContain('<ComponentInstanceNode key="submit" name="Submit" component="btn1" />');
});
