import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const openRouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
  headers: {
    "HTTP-Referer": process.env.OPEN_ROUTER_APP_URL!,
    "X-Title": process.env.OPEN_ROUTER_APP_NAME!,
  },
});
