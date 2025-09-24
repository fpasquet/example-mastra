import { MCPServer } from "@mastra/mcp";

import { getContentWithMetaDataTool } from "../tools/get-content-with-metadata-tool";
import { listContentsTool } from "../tools/list-contents-tool";
import { searchContentsTool } from "../tools/search-contents-tool";

export const mcpServer = new MCPServer({
  id: "mcp-server",
  name: "MCP Server",
  version: "1.0.0",
  tools: { getContentWithMetaDataTool, listContentsTool, searchContentsTool },
});
