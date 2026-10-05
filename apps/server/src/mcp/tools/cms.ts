import type { McpServer } from "@modelcontextprotocol/server";
import {
  cmsCollectionCreate,
  cmsCollectionDelete,
  cmsCollectionsList,
  cmsFieldsSet,
  cmsItemsDelete,
  cmsItemsList,
  cmsItemsOrder,
  cmsItemsUpsert,
} from "@sitewright/core";
import { CMS_UNDO_RULE, CMS_VALUES_RULE } from "../../constants/mcp.ts";
import type { ToolContext } from "../../types/mcp.ts";
import { addOperationTool } from "../add-tool.ts";

export function registerCmsTools(server: McpServer, context: ToolContext): void {
  addOperationTool(server, context, cmsCollectionsList, {
    name: "cms_collections_list",
    title: "List CMS collections",
    description:
      "Lists the project's CMS collections with their fields (type, enum cases, the collection a reference points at) and item counts. Collections a sync plugin manages are read-only here.",
  });

  addOperationTool(server, context, cmsCollectionCreate, {
    name: "cms_collection_create",
    title: "Create a CMS collection",
    description: `Creates a CMS collection with its fields. Every collection already has a title and a slug. ${CMS_UNDO_RULE}`,
  });

  addOperationTool(server, context, cmsCollectionDelete, {
    name: "cms_collection_delete",
    title: "Delete a CMS collection",
    description: `Deletes a CMS collection with all its items and returns its fields and items. Only when the user asked for it, or for a collection you created yourself in this task. Needs a Server API key. ${CMS_UNDO_RULE}`,
  });

  addOperationTool(server, context, cmsFieldsSet, {
    name: "cms_fields_set",
    title: "Change CMS fields",
    description: `Adds, removes and orders a collection's fields. Removing a field drops its value in every item: do it only when the user asked. ${CMS_UNDO_RULE}`,
  });

  addOperationTool(server, context, cmsItemsList, {
    name: "cms_items_list",
    title: "List CMS items",
    description: `Lists a collection's items, a page at a time, with their values by field name. ${CMS_VALUES_RULE}`,
  });

  addOperationTool(server, context, cmsItemsUpsert, {
    name: "cms_items_upsert",
    title: "Write CMS items",
    description: `Creates or updates items by slug, with values by field name; the journal can undo it. ${CMS_VALUES_RULE}`,
  });

  addOperationTool(server, context, cmsItemsDelete, {
    name: "cms_items_delete",
    title: "Delete CMS items",
    description:
      "Deletes items by slug; the journal can undo it, and their values come back in the result too. Delete only items you created or the user asked to remove.",
  });

  addOperationTool(server, context, cmsItemsOrder, {
    name: "cms_items_order",
    title: "Order CMS items",
    description: "Moves items to the top of a collection in the given order; the rest keep their order after them.",
  });
}
