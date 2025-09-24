import { createTool } from "@mastra/core";
import { z } from "zod";

import {
  blogContentMetaExtendedSchema,
  blogContentMetaSchema,
} from "../lib/github";
import { githubClient } from "../lib/github-client";

export const getContentWithMetaDataInputSchema = blogContentMetaSchema
  .pick({ path: true })
  .describe(
    "Identifier of the target content to fetch. Requires internal path.",
  );

export const getContentWithMetaDataOutputSchema = z
  .object({
    metaData: blogContentMetaExtendedSchema,
    content: z
      .string()
      .describe(
        "Raw markdown content. May be null/undefined if the content cannot be fetched.",
      ),
  })
  .describe("Fetched content payload (raw markdown and metadata).");

/**
 * Retrieves the full markdown content of a specific entry.
 * The content type and internal path are inferred from the metadata.
 * For tutorials, returns the merged content (index.md + steps).
 */
export const getContentWithMetaDataTool = createTool({
  id: "get-content-with-metadata",
  description:
    "Fetches the full markdown content of an article or tutorial. For tutorials, returns the merged content (index.md + steps), along with its metadata.",
  inputSchema: getContentWithMetaDataInputSchema,
  outputSchema: getContentWithMetaDataOutputSchema.nullish(),
  execute: async ({ context }) => {
    return githubClient.getContentWithMetaData(context.path);
  },
});
