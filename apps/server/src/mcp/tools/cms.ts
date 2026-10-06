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
      "Lists the project's CMS collections with their fields (id, type, enum cases, the collection a reference points at, a List's nested fields) and item counts. A field binds on the canvas by its id: var(--variable-<id>). Collections a sync plugin manages are read-only here.",
  });

  addOperationTool(server, context, cmsCollectionCreate, {
    name: "cms_collection_create",
    title: "Create a CMS collection",
    description: `Creates a CMS collection with its fields. A string Title comes first, unless you pass a string field named Title or Name, which then goes first: Framer names items and builds their slugs from the first string field. Types: string, formattedText, number, boolean, date, link, image, file, color, enum (with cases), collectionReference and multiCollectionReference (with collection), array (a List: entries with nested fields, e.g. [{ "name": "Image", "type": "image" }] for a gallery). Framer gives an item written without them true for a boolean field and #09F for a color field: write those for every item. ${CMS_UNDO_RULE}`,
  });

  addOperationTool(server, context, cmsCollectionDelete, {
    name: "cms_collection_delete",
    title: "Delete a CMS collection",
    description: `Deletes a CMS collection with all its items and returns its fields and items. Only when the user asked for it, or for a collection you created yourself in this task. Needs a Server API key. ${CMS_UNDO_RULE}`,
  });

  addOperationTool(server, context, cmsFieldsSet, {
    name: "cms_fields_set",
    title: "Change CMS fields",
    description: `Adds, renames, removes and orders a collection's fields; update also adds, renames, removes and orders an enum's cases. A rename keeps every item's value and the layers bound to the field. Removing a field drops its value in every item: do it only when the user asked. Before a removal it searches every page for layers bound to the field (with a Server API key) and refuses while there are any, naming the pages: rebind them first, or pass force: true, and those layers show Framer's placeholder "Content". A new boolean field is true and a new color field #09F in every item until written. ${CMS_UNDO_RULE}`,
  });

  addOperationTool(server, context, cmsItemsList, {
    name: "cms_items_list",
    title: "List CMS items",
    description: `Lists a collection's items, a page at a time, with their id, slug and values by field name, Lists in full. A collection list on the canvas filters by a reference with the referenced item's id; a slug there matches nothing. ${CMS_VALUES_RULE}`,
  });

  addOperationTool(server, context, cmsItemsUpsert, {
    name: "cms_items_upsert",
    title: "Write CMS items",
    description: `Creates or updates items by slug, with values by field name, and answers each item's id and the slug Framer kept (lower case with hyphens); the journal can undo it. ${CMS_VALUES_RULE}`,
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
