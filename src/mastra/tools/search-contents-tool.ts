import { createTool } from "@mastra/core";
import { z } from "zod";

import { blogContentMetaSchema } from "../lib/github";
import { githubClient } from "../lib/github-client";
import { contentFiltersSchema } from "../schemas";

export const searchContentsInputSchema = contentFiltersSchema
  .extend({
    query: z
      .string()
      .min(1, "Search query must not be empty.")
      .describe("Search query string (full-text over markdown)."),
  })
  .describe(
    "Search parameters. Omitting a filter means the search spans that entire dimension.",
  );

export const searchContentsOutputSchema = z
  .array(blogContentMetaSchema)
  .describe("Array of blog content metadata entries matching the search.");

/**
 * Full-text search over blog contents (markdown).
 * If filters are omitted, search runs across all languages and content types.
 */
export const searchContentsTool = createTool({
  id: "search-contents",
  description:
    "Search blog contents (markdown in articles/tutorials). If filters are omitted, search across all languages and content types.",
  inputSchema: searchContentsInputSchema,
  outputSchema: searchContentsOutputSchema,
  execute: async ({ context }) => {
    const { query, lang, contentType } = context;
    return githubClient.searchContents(query, { lang, contentType });
  },
});
