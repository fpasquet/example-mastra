import { GitHubBlogClient } from "./github";

export const githubClient = new GitHubBlogClient(process.env.GITHUB_TOKEN);
