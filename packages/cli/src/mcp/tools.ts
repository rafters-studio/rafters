/**
 * MCP Tools for Rafters Design System
 *
 * 4 focused tools for agent ASSEMBLY (not design):
 *
 * 1. rafters_composite - Query composites with designer intent
 * 2. rafters_pattern - Design pattern guidance (do/never)
 * 3. rafters_component - Component intelligence
 * 4. rafters_workspaces - List available workspaces
 *
 * Agents assemble from pre-made decisions. Token design lives in Studio.
 * Token import lives in `rafters init` / `rafters import`, not MCP.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  type CompositeFile,
  getAllComposites,
  getComposite,
  getCompositesByCategory,
  registerComposite,
  searchComposites,
} from '@rafters/composites';
// node-fs adapter lives behind the server-only subpath (it imports node:fs).
import { discoverFromDirs } from '@rafters/composites/node';
import type { RaftersConfig } from '../commands/init.js';
import { registryClient } from '../registry/client.js';
import { getRaftersPaths, resolveReadSet } from '../utils/paths.js';
import { resolveWorkspace, type Workspace } from '../utils/workspaces.js';

const WORKSPACE_PARAM = {
  workspace: {
    type: 'string',
    description:
      'Workspace name (directory basename). Required when the MCP session has multiple workspaces and none matches cwd. Call rafters_workspaces to list options.',
  },
} as const;

// ==================== Tool Definitions ====================

export const TOOL_DEFINITIONS = [
  {
    name: 'rafters_workspaces',
    description:
      'List rafters workspaces visible to this MCP session. Returns name, path, and which one is the default for unscoped tool calls. Call this first when the project might be a monorepo.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'rafters_composite',
    description:
      'Query composites by ID, search term, or category. Returns designer intent (solves, appliesWhen, do/never), I/O rules for chaining, and block structure.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        id: { type: 'string', description: 'Get a specific composite by ID' },
        query: { type: 'string', description: 'Fuzzy search by name/keywords' },
        category: { type: 'string', description: 'Filter by category' },
      },
      required: [],
    },
  },
  {
    name: 'rafters_pattern',
    description:
      'Get design pattern guidance by querying composites. Search by what the pattern solves (e.g., "authentication", "data entry", "navigation") to get do/never rules, cognitive load, and designer intent.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        solves: {
          type: 'string',
          description: 'What problem the pattern solves (searches composite solves field)',
        },
        query: {
          type: 'string',
          description: 'Fuzzy search across composite names, keywords, and descriptions',
        },
      },
      required: [],
    },
  },
  {
    name: 'rafters_component',
    description:
      'Get component intelligence: cognitive load, accessibility, do/never guidance, variants, sizes.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        name: {
          type: 'string',
          description: 'Component name (e.g., "button", "dialog", "card")',
        },
      },
      required: ['name'],
    },
  },
] as const;

// ==================== Tool Handler ====================

export class RaftersToolHandler {
  private workspaces: Workspace[];
  private defaultWorkspace: Workspace | null;
  /** Tracks per-workspace composite loading so we only read from disk once. */
  private compositesLoadedFor = new Set<string>();
  /** Tracks built-in composite loading separately (loaded once globally). */
  private builtInCompositesLoaded = false;

  constructor(workspaces: Workspace[], defaultWorkspace: Workspace | null) {
    this.workspaces = workspaces;
    this.defaultWorkspace = defaultWorkspace;
  }

  async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    switch (name) {
      case 'rafters_workspaces':
        return this.handleWorkspaces();
      case 'rafters_composite':
        return this.handleComposite(args);
      case 'rafters_pattern':
        return this.handlePattern(args as { solves?: string; query?: string; workspace?: string });
      case 'rafters_component':
        return this.handleComponent(args.name as string);
      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Unknown tool: ${name}`,
                suggestion:
                  'Available tools: rafters_workspaces, rafters_composite, rafters_pattern, rafters_component.',
              }),
            },
          ],
        };
    }
  }

  /**
   * Resolve the requested workspace, returning a structured error result when
   * the agent didn't pick one and there's no default. Returns the default
   * workspace (which may itself be null when no `.rafters/` exists at all)
   * for tools that read agent-shipped data and can degrade gracefully.
   */
  private resolve(name: string | undefined): Workspace | null {
    return resolveWorkspace(this.workspaces, this.defaultWorkspace, name);
  }

  /**
   * Build a structured error response listing the available workspaces.
   * Use this when a tool requires a workspace and the agent didn't pick one.
   */
  private workspaceRequiredError(): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'workspace parameter required',
            suggestion:
              'Multiple workspaces are available. Pass `workspace` with one of the names below.',
            workspaces: this.workspaces.map((w) => ({ name: w.name, root: w.root })),
          }),
        },
      ],
    };
  }

  private async handleWorkspaces(): Promise<CallToolResult> {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              workspaces: this.workspaces.map((w) => ({
                name: w.name,
                root: w.root,
                isDefault: w.name === this.defaultWorkspace?.name,
              })),
              defaultWorkspace: this.defaultWorkspace?.name ?? null,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  /**
   * Recursively discover composites under the given directories via the shared
   * discovery core (node-fs adapter), then register each into the in-memory
   * registry. Duplicate ids -- across this call or against already-registered
   * composites -- are ignored: the first registration wins.
   */
  private async loadCompositesFromDirs(...dirs: string[]): Promise<void> {
    const { registry } = await discoverFromDirs(...dirs);
    for (const composite of registry.values()) {
      try {
        registerComposite(composite);
      } catch {
        // Already registered -- first one wins.
      }
    }
  }

  private async ensureCompositesLoaded(workspace: Workspace | null): Promise<void> {
    if (!this.builtInCompositesLoaded) {
      await this.loadCompositesFromDirs(
        join(process.cwd(), 'node_modules/@rafters/composites/src/typography'),
      );
      this.builtInCompositesLoaded = true;
    }

    if (workspace && !this.compositesLoadedFor.has(workspace.root)) {
      await this.loadCompositesFromDirs(...(await this.compositeReadRoots(workspace.root)));
      this.compositesLoadedFor.add(workspace.root);
    }
  }

  /**
   * Resolve the set of folders to scan for composite manifests in a workspace.
   * Reads `.rafters/config.rafters.json` and applies the workspace's
   * `compositesPath` (which may be a string or an array of entries to support
   * shared packages like `@shingle/shared`). Falls back to `.rafters/composites`
   * when no config or compositesPath is set.
   */
  private async compositeReadRoots(workspaceRoot: string): Promise<string[]> {
    const paths = getRaftersPaths(workspaceRoot);
    let config: RaftersConfig | null = null;
    try {
      config = JSON.parse(await readFile(paths.config, 'utf-8')) as RaftersConfig;
    } catch {
      // No config -- fall through to default
    }
    if (!config?.compositesPath) {
      return [join(paths.root, 'composites')];
    }
    return resolveReadSet(config.compositesPath, workspaceRoot);
  }

  private async handleComposite(args: Record<string, unknown>): Promise<CallToolResult> {
    const { id, query, category, workspace } = args as {
      id?: string;
      query?: string;
      category?: string;
      workspace?: string;
    };

    const resolved = this.resolve(workspace);
    if (workspace && !resolved) {
      return this.workspaceRequiredError();
    }

    await this.ensureCompositesLoaded(resolved);

    let composites: CompositeFile[];

    if (id) {
      const c = getComposite(id);
      composites = c ? [c] : [];
    } else if (query) {
      composites = searchComposites(query);
    } else if (category) {
      composites = getCompositesByCategory(category);
    } else {
      composites = getAllComposites();
    }

    const result = composites.map((c) => ({
      id: c.manifest.id,
      name: c.manifest.name,
      category: c.manifest.category,
      description: c.manifest.description,
      cognitiveLoad: c.manifest.cognitiveLoad,
      solves: c.manifest.solves,
      appliesWhen: c.manifest.appliesWhen,
      usagePatterns: c.manifest.usagePatterns,
      input: c.input,
      output: c.output,
      blockCount: c.blocks.length,
      // Surface which blocks carry which validation rules. Rules compile to
      // native HTML5 constraint attributes at build, so agents need to see
      // them to reason about a composite's behavior. Only blocks with rules
      // are listed -- the array is empty when nothing is constrained.
      blockRules: c.blocks
        .filter((b) => b.rules && b.rules.length > 0)
        .map((b) => ({ id: b.id, type: b.type, rules: b.rules })),
    }));

    return { content: [{ type: 'text', text: JSON.stringify({ composites: result }, null, 2) }] };
  }

  private async handlePattern(args: {
    solves?: string;
    query?: string;
    workspace?: string;
  }): Promise<CallToolResult> {
    const { solves, query, workspace } = args;

    const resolved = this.resolve(workspace);
    if (workspace && !resolved) {
      return this.workspaceRequiredError();
    }

    await this.ensureCompositesLoaded(resolved);
    let composites: CompositeFile[];

    if (solves) {
      // Search composites by what they solve
      const all = getAllComposites();
      const solvesLower = solves.toLowerCase();
      composites = all.filter(
        (c) =>
          c.manifest.solves?.toLowerCase().includes(solvesLower) ||
          c.manifest.appliesWhen?.some((a) => a.toLowerCase().includes(solvesLower)),
      );
    } else if (query) {
      composites = searchComposites(query);
    } else {
      // Return all composites that have usagePatterns (do/never)
      composites = getAllComposites().filter((c) => c.manifest.usagePatterns);
    }

    if (composites.length === 0) {
      const all = getAllComposites();
      const available = all
        .filter((c) => c.manifest.solves || c.manifest.usagePatterns)
        .map((c) => ({
          id: c.manifest.id,
          solves: c.manifest.solves,
        }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'No patterns found matching query',
              available,
            }),
          },
        ],
      };
    }

    // Return pattern-focused view of composites
    const patterns = composites.map((c) => ({
      id: c.manifest.id,
      name: c.manifest.name,
      solves: c.manifest.solves,
      appliesWhen: c.manifest.appliesWhen,
      cognitiveLoad: c.manifest.cognitiveLoad,
      usagePatterns: c.manifest.usagePatterns,
    }));

    return { content: [{ type: 'text', text: JSON.stringify({ patterns }, null, 2) }] };
  }

  private async handleComponent(componentName: string): Promise<CallToolResult> {
    try {
      const item = await registryClient.fetchComponent(componentName);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                name: item.name,
                type: item.type,
                description: item.description,
                primitives: item.primitives,
                rules: item.rules,
                composites: item.composites,
                files: item.files,
                // The intelligence field carries the WHY of the component:
                // cognitive load, accessibility, do/never, semantic meaning.
                // Extracted from JSDoc by the registry generator and present
                // on every component JSON. Previously stripped by the schema
                // (not declared) and not referenced by the handler -- the
                // tool's whole reason for existing went missing somewhere.
                intelligence: item.intelligence,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: message }),
          },
        ],
      };
    }
  }
}
