/** The fields of a blog collection that ranks: what search and link previews read, and what interlinking needs. */
export const SEO_BLOG_FIELDS = [
  {
    name: "Title",
    type: "string",
  },
  {
    name: "Excerpt",
    type: "string",
  },
  {
    name: "Content",
    type: "formattedText",
  },
  {
    name: "Image",
    type: "image",
  },
  {
    name: "Image Alt",
    type: "string",
  },
  {
    name: "Meta Title",
    type: "string",
  },
  {
    name: "Meta Description",
    type: "string",
  },
  {
    name: "Target Keyword",
    type: "string",
  },
  {
    name: "Tags",
    type: "string",
  },
  {
    name: "Published",
    type: "date",
  },
  {
    name: "Author",
    type: "string",
  },
] as const;

/** The default categories of a new SEO collection, and the names of the fields cms_interlink reads and writes. */
export const SEO_CATEGORIES = ["Guides", "News", "Case studies"] as const;
export const SEO_CATEGORY_FIELD = "Category";
export const SEO_TAGS_FIELD = "Tags";
export const SEO_KEYWORD_FIELD = "Target Keyword";
export const SEO_RELATED_FIELD = "Related";

/** How many related items cms_interlink writes per item by default, and at most. */
export const INTERLINK_TOP = 3;
export const INTERLINK_TOP_MAX = 10;
