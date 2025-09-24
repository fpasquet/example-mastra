import { z } from "zod";

import { CONTENT_LANGUAGES, CONTENT_TYPES } from "./constants";

export const langSchema = z
  .enum(Object.values(CONTENT_LANGUAGES))
  .describe("Language of the content");
export type Lang = z.infer<typeof langSchema>;

export const contentTypeSchema = z
  .enum(Object.values(CONTENT_TYPES))
  .describe("Type of the content");
export type ContentType = z.infer<typeof contentTypeSchema>;

export const blogContentMetaSchema = z
  .object({
    contentType: contentTypeSchema,
    lang: langSchema,
    path: z.string().describe("Internal path to the content resource"),
    url: z.string().describe("Public URL of the content"),
    slug: z.string().describe("Unique slug identifier for the content"),
    date: z.coerce.date().describe("Publication date in YYYY-MM-DD format"),
    step: z
      .object({
        slug: z.string().describe("Slug identifier of the related step"),
        url: z.string().describe("Public URL of the related step"),
      })
      .nullish()
      .describe("Optional metadata about a related step"),
  })
  .describe("Metadata for a blog content");
export type BlogContentMeta = z.infer<typeof blogContentMetaSchema>;

export const blogContentMetaExtendedSchema = blogContentMetaSchema
  .pick({
    contentType: true,
    lang: true,
    date: true,
    slug: true,
  })
  .extend({
    title: z.string().min(1).describe("Title of the content"),
    excerpt: z
      .string()
      .min(1)
      .describe("Short summary or introduction of the content"),
    categories: z
      .array(z.string().min(1))
      .nonempty()
      .describe("List of categories associated with the content"),
    authors: z
      .array(z.string().min(1))
      .nonempty()
      .describe("List of authors of the content"),
    cover: z
      .object({
        path: z
          .string()
          .regex(/^\/[^\s]+$/, "Expected absolute path starting with '/'")
          .describe("Path to the cover image file"),
      })
      .nullish()
      .describe("Cover image metadata"),
    steps: z
      .array(z.string().min(1))
      .optional()
      .describe("List of step identifiers (only for tutorials)"),
  })
  .superRefine((data, ctx) => {
    if (data.contentType === "tutorial" && !data.steps) {
      ctx.addIssue({
        path: ["steps"],
        code: "custom",
        message: "Steps are required when contentType is 'tutorial'",
      });
    }

    if (data.contentType !== "tutorial" && data.steps) {
      ctx.addIssue({
        path: ["steps"],
        code: "custom",
        message: "Steps should only be present if contentType is 'tutorial'",
      });
    }
  })
  .describe("Metadata extended for a blog content");
export type BlogContentMetaExtended = z.infer<
  typeof blogContentMetaExtendedSchema
>;
