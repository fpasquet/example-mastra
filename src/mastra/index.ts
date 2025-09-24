import { Mastra } from "@mastra/core/mastra";

import { blogAgent } from "./agents/blog-agent";
import { quizAgent } from "./agents/quiz-agent";
import { logger } from "./lib/logger";
import { storage } from "./lib/storage";
import { mcpServer } from "./mcp/mcp-server";
import { blogToQuizWorkflow } from "./workflows/blog-to-quiz-workflow";

export const mastra = new Mastra({
  agents: { quizAgent, blogAgent },
  workflows: { blogToQuizWorkflow },
  mcpServers: { mcpServer },
  storage,
  logger,
});
