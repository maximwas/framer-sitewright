import type { McpServer } from "@modelcontextprotocol/server";
import { OperationError } from "@sitewright/core";
import { BriefInputSchema, BriefOutputSchema } from "../../schemas/brief.ts";
import { currentProject } from "../../transports/current-project.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { briefView } from "../../utils/brief.ts";
import { addTool } from "../add-tool.ts";

export function registerBriefTools(server: McpServer, { transports, journal, briefs }: ToolContext): void {
  addTool(server, {
    name: "project_brief",
    title: "Project brief",
    description:
      "The questions to ask the user before building or redesigning a Framer site, and the answers saved for this project. Call it first on any new site or redesign, not for a fix or one part of an existing site (read the saved answers there if it has them): it returns the questions still open (purpose and main action, whose site it is, name, pages, references, mood, palettes to propose, light or dark theme, assets, copy, motion level, audience, fonts, imagery, CMS collections, languages, features, SEO, handoff, plan, screens, analytics, accessibility), each with options, what to propose and a fallback, and how to ask them. Save answers with answers after every round; the brief stays with the project, so read it before later work on the same site instead of asking again.",
    input: BriefInputSchema,
    output: BriefOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    run: async ({ answers, reset }) => {
      const project = await currentProject(transports);
      const saving = answers !== undefined || reset;

      if (saving && project === null) {
        throw new OperationError(
          "NOT_CONFIGURED",
          "No project is open, and the brief is kept per project.",
          "Ask the user to open the Sitewright plugin in the project and click Connect, then save the answers again.",
        );
      }

      const brief =
        project === null
          ? null
          : saving
            ? await briefs.save(project, answers ?? {}, reset)
            : await briefs.get(project.id);
      const saved = Object.keys(answers ?? {}).length;

      // The journal's skills view shows that the agent ran the brief.
      await journal.noteSkill({
        at: new Date().toISOString(),
        skill: "sitewright-project-brief",
        reference: saving ? `${reset ? "Started over; saved" : "Saved"} ${saved} answers` : "Questions",
      });

      return briefView(project, brief);
    },
  });
}
