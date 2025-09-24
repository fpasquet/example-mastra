import type { LogLevel } from "@mastra/loggers";

import { PinoLogger } from "@mastra/loggers";

export const logger = new PinoLogger({
  name: "Agent AI",
  level: (process.env.LOG_LEVEL as undefined | LogLevel) ?? "info",
});
