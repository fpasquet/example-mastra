import matter from "gray-matter";
import { Octokit } from "octokit";

import type {
  BlogContentMeta,
  BlogContentMetaExtended,
  ContentType,
  Lang,
} from "./schemas";

import { CONTENT_LANGUAGES, CONTENT_TYPES } from "./constants";
import { blogContentMetaExtendedSchema } from "./schemas";
import {
  buildQualifierPath,
  decodeBase64ToUtf8,
  getMetaDataByFileOrDirectoryPath,
  isNotFoundError,
} from "./utils";

export class GitHubBlogClient {
  private octokit: Octokit;
  private owner = "eleven-labs";
  private repo = "blog.eleven-labs.com";

  constructor(token?: string) {
    this.octokit = new Octokit({ auth: token });
  }

  private async getContentFileWithMetaData(path: string): Promise<{
    metaData: BlogContentMetaExtended;
    content: string;
  } | null> {
    try {
      const octokitResponse = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });
      if (!("content" in octokitResponse.data)) {
        throw new Error("Invalid article or tutorial content response");
      }

      const markdown = decodeBase64ToUtf8(octokitResponse.data.content);
      const { data, content } = matter(markdown);
      console.log(data);

      return {
        metaData: blogContentMetaExtendedSchema.parse(data),
        content,
      };
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  private async listArticles(): Promise<BlogContentMeta[]> {
    const articles: BlogContentMeta[] = [];

    for (const lang of Object.values(CONTENT_LANGUAGES)) {
      const files = await this.listFilesOrDirectories(`_articles/${lang}`);

      for (const file of files) {
        const metaData = getMetaDataByFileOrDirectoryPath(file.path);
        if (!metaData) continue;
        articles.push(metaData);
      }
    }

    return articles;
  }

  private async listFilesOrDirectories(
    path: string,
    type: "file" | "dir" = "file",
  ): Promise<{ name: string; path: string }[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
      });

      if (Array.isArray(data)) {
        return data
          .filter((item) => item.type === type)
          .map((file) => ({ name: file.name, path: file.path }));
      }

      return [];
    } catch (error) {
      if (isNotFoundError(error)) return [];
      throw error;
    }
  }

  private async listTutorials(): Promise<BlogContentMeta[]> {
    const tutorials: BlogContentMeta[] = [];

    for (const lang of Object.values(CONTENT_LANGUAGES)) {
      const directories = await this.listFilesOrDirectories(
        `_tutorials/${lang}`,
        "dir",
      );

      for (const dir of directories) {
        const metaData = getMetaDataByFileOrDirectoryPath(dir.path);
        if (!metaData) continue;
        tutorials.push(metaData);
      }
    }

    return tutorials;
  }

  /**
   * Lists the contents (articles and tutorials) with optional filters.
   * @param options.lang Language filter
   * @param options.type Type filter ("article" | "tutorial")
   */
  async listContents(options?: {
    lang?: Lang;
    contentType?: ContentType;
  }): Promise<BlogContentMeta[]> {
    const needArticles =
      !options?.contentType || options.contentType === "article";
    const needTutorials =
      !options?.contentType || options.contentType === "tutorial";

    const [articles, tutorials] = await Promise.all([
      needArticles
        ? this.listArticles()
        : Promise.resolve([] as BlogContentMeta[]),
      needTutorials
        ? this.listTutorials()
        : Promise.resolve([] as BlogContentMeta[]),
    ]);

    let all = [...articles, ...tutorials];

    if (options?.lang) {
      all = all.filter((c) => c.lang === options.lang);
    }
    return all.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  /**
   * Searches for markdown content using GitHub code search with filters.
   * Returns normalized search results with unified meta inferred from the path.
   * @param query a free search query (keywords)
   * @param options Search filter options
   * @param options.lang language filter
   * @param options.type type filter ("article" or "tutorial")
   */
  async searchContents(
    query: string,
    { lang, contentType }: { lang?: Lang; contentType?: ContentType } = {},
  ): Promise<BlogContentMeta[]> {
    const qualifiers = [
      `repo:${this.owner}/${this.repo}`,
      "extension:md",
      buildQualifierPath({
        directory: "articles",
        enabled: !contentType || contentType === CONTENT_TYPES.ARTICLE,
        lang,
      }),
      buildQualifierPath({
        directory: "tutorials",
        enabled: !contentType || contentType === CONTENT_TYPES.TUTORIAL,
        lang,
      }),
    ].filter(Boolean);

    const q = `${query} ${qualifiers.join(" ")}`.trim();
    const octokitResponse = await this.octokit.rest.search.code({ q });

    const searchResult = new Map<string, BlogContentMeta>();

    for (const item of octokitResponse.data.items) {
      const metaData = getMetaDataByFileOrDirectoryPath(item.path);
      if (!metaData) continue;
      const key = `${String(metaData.contentType).toLowerCase()}${String(metaData.slug).toLowerCase()}`;
      if (!searchResult.has(key)) {
        searchResult.set(key, {
          contentType: metaData.contentType,
          lang: metaData.lang,
          path: metaData.path,
          date: metaData.date,
          slug: metaData.slug,
          url: metaData.url,
        });
      }
    }

    return Array.from(searchResult.values());
  }

  /**
   * Retrieves the unified markdown content.
   * - Article: returns the content of the .md file
   * - Tutorial: concatenates index.md with all the steps/*.md (sorted by step)
   */
  async getContentWithMetaData(
    path: string,
  ): ReturnType<typeof this.getContentFileWithMetaData> {
    const metaData = getMetaDataByFileOrDirectoryPath(path);
    if (!metaData) return null;

    if (metaData.contentType === CONTENT_TYPES.ARTICLE) {
      return this.getContentFileWithMetaData(path);
    }

    let content = "";
    const contentTutorialWithMetaData = await this.getContentFileWithMetaData(
      `${path}index.md`,
    );
    if (contentTutorialWithMetaData?.metaData.steps) {
      for (const step of contentTutorialWithMetaData.metaData.steps) {
        const contentStepWithMetaData = await this.getContentFileWithMetaData(
          `${path}steps/${step}.md`,
        );
        if (contentStepWithMetaData?.content) {
          content += `\n\n---\n\n${contentStepWithMetaData?.content}`;
        }
      }

      return {
        metaData: contentTutorialWithMetaData.metaData,
        content,
      };
    }

    return null;
  }
}
