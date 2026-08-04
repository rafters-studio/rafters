/**
 * MCP Server for Rafters Design Token System
 *
 * Provides an MCP server with stdio transport for AI agent access to design tokens.
 * Implements graceful shutdown on SIGINT/SIGTERM.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Workspace } from '../utils/workspaces.js';
import { VERSION } from '../version.js';
import { RaftersToolHandler, TOOL_DEFINITIONS } from './tools.js';

/**
 * Create and start the MCP server.
 *
 * @param workspaces - Every rafters-initialised workspace reachable from cwd.
 *                     Empty when no monorepo manifest and no `.rafters/` is found.
 * @param defaultWorkspace - The workspace used when a tool call omits the
 *                           `workspace` parameter. Null when there are zero
 *                           workspaces, or when there are multiple and none
 *                           contains the cwd.
 */
export async function startMcpServer(
  workspaces: Workspace[],
  defaultWorkspace: Workspace | null,
): Promise<void> {
  const toolHandler = new RaftersToolHandler(workspaces, defaultWorkspace);

  // Create MCP server
  const server = new Server(
    {
      name: 'rafters',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOL_DEFINITIONS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return toolHandler.handleToolCall(name, args ?? {});
  });

  // Create stdio transport
  const transport = new StdioServerTransport();

  // Setup graceful shutdown
  const shutdown = async (): Promise<void> => {
    try {
      await server.close();
    } catch {
      // Ignore errors during shutdown
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Connect and run
  await server.connect(transport);

  // Keep the process running until shutdown
  await new Promise<void>(() => {
    // This promise never resolves - server runs until shutdown signal
  });
}
