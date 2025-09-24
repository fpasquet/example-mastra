import { createTool } from "@mastra/core";
import { z } from "zod";

import { blogContentMetaSchema } from "../lib/github";
import { githubClient } from "../lib/github-client";
import { contentFiltersSchema } from "../schemas";

export const listContentsOutputSchema = z
  .array(blogContentMetaSchema)
  .describe("Array of blog content metadata entries.");

/**
 * Lists blog contents stored in GitHub.
 * If no filters are provided, all languages and content types are returned.
 */
export const listContentsTool = createTool({
  id: "list-contents",
  description:
    "List blog contents (articles and tutorials). If no filters are provided, results include all languages and content types.",
  inputSchema: contentFiltersSchema,
  outputSchema: listContentsOutputSchema,
  execute: async ({ context }) => {
    const { lang, contentType } = context;
    return githubClient.listContents({ lang, contentType });
  },
});
