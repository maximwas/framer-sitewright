import type * as z from "zod";
import type { PublishIssueSchema } from "../schemas/publish.ts";

export type PublishIssue = z.infer<typeof PublishIssueSchema>;
