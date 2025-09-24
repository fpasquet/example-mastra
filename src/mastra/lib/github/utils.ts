import type { RequestError } from "@octokit/types";

import type { BlogContentMeta, Lang } from "./schemas";

import { CONTENT_TYPES } from "./constants";
import { blogContentMetaSchema } from "./schemas";

/**
 * Decodes a base64 string to utf-8
 * @param b64 - The base64 string to decode
 * @returns The decoded string
 */
export function decodeBase64ToUtf8(b64: string): string {
  return Buffer.from(b64, "base64").toString("utf-8");
}

/**
 * Parses a file or directory name.
 * Example: "_articles/fr/2024-05-12-my-post.md" or "_tutorials/fr/2024-05-12-my-tuto" or "_tutorials/fr/2024-05-12-my-tuto/steps/my-step.md"
 *
 * @param path - The name of the file or directory to parse.
 * @returns An object containing the metaData, or null if the name is invalid.
 */
export function getMetaDataByFileOrDirectoryPath(
  path: string,
): BlogContentMeta | null {
  const regex = new RegExp(
    /^(_(articles|tutorials)\/(fr|en)\/(\d{4}-\d{2}-\d{2})-([^/.]+))(?:\.md|\/steps\/([^/]+)\.md)?$/,
  );
  const matches = path.match(regex);
  if (!matches) return null;

  const [, pathWithoutExtension, type, lang, date, slug, stepSlug] = matches;
  const contentType =
    type === "tutorials" ? CONTENT_TYPES.TUTORIAL : CONTENT_TYPES.ARTICLE;
  const url = `https://blog.eleven-labs.com/${lang}/${slug}/`;

  const metaData = {
    contentType,
    lang,
    path: `${pathWithoutExtension}${contentType === CONTENT_TYPES.ARTICLE ? ".md" : "/"}`,
    date,
    slug,
    url,
    step: stepSlug
      ? {
          slug: stepSlug,
          url: `${url}${stepSlug}`,
        }
      : undefined,
  };

  return blogContentMetaSchema.parse(metaData);
}

export function buildQualifierPath({
  directory,
  enabled = true,
  lang,
}: {
  directory: string;
  enabled?: boolean;
  lang?: Lang;
}) {
  return enabled ? `path:_${directory}${lang ? `/${lang}` : ""}` : "";
}

export function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as RequestError).status === 404
  );
}
