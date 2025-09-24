import { z } from "zod";

import { blogContentMetaSchema } from "./lib/github";

export const contentFiltersSchema = z
  .object({
    lang: blogContentMetaSchema.shape.lang
      .optional()
      .describe(
        "Optional language filter ('fr' | 'en'). If omitted, include all languages.",
      ),
    contentType: blogContentMetaSchema.shape.contentType
      .optional()
      .describe(
        "Optional content type filter ('article' | 'tutorial'). If omitted, include all content types.",
      ),
  })
  .describe(
    "Optional filters for querying contents. Omitting a field means no filtering on that dimension.",
  );
export type ContentFilters = z.infer<typeof contentFiltersSchema>;
