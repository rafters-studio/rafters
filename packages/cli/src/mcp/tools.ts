/**
 * MCP Tools for Rafters Design System
 *
 * 4 focused tools for agent ASSEMBLY (not design):
 *
 * 1. rafters_composite - Query composites with designer intent
 * 2. rafters_rule - Query or create validation rules
 * 3. rafters_pattern - Design pattern guidance (do/never)
 * 4. rafters_component - Component intelligence
 *
 * Agents assemble from pre-made decisions. Token design lives in Studio.
 * Token import lives in `rafters init` / `rafters import`, not MCP.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  type CompositeFile,
  CompositeFileSchema,
  getAllComposites,
  getComposite,
  getCompositesByCategory,
  registerComposite,
  searchComposites,
} from '@rafters/composites';
import type { RaftersConfig } from '../commands/init.js';
import { registryClient } from '../registry/client.js';
import { getRaftersPaths } from '../utils/paths.js';
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
    name: 'rafters_rule',
    description:
      'Query validation rules or create new ones. Rules are named validation patterns (required, email, password, etc.) that composites can apply.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        ...WORKSPACE_PARAM,
        name: { type: 'string', description: 'Get a specific rule by name' },
        query: { type: 'string', description: 'Search rules by name/description' },
        create: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Rule name (kebab-case)' },
            description: { type: 'string', description: 'What this rule validates' },
            zodSchema: { type: 'string', description: 'Zod schema as a string' },
          },
          required: ['name', 'description', 'zodSchema'],
          description: 'Create a new rule (provide all three fields)',
        },
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
      case 'rafters_rule':
        return this.handleRule(args);
      case 'rafters_pattern':
        return this.handlePattern(args as { solves?: string; query?: string; workspace?: string });
      case 'rafters_component':
        return this.handleComponent(args.name as string);
      default: {
        const suggestion =
          name === 'rafters_onboard'
            ? 'rafters_onboard was removed. Token import is now a CLI operation: run `rafters init` (auto-detects and prompts) or `rafters import` (standalone).'
            : 'Available tools: rafters_workspaces, rafters_composite, rafters_rule, rafters_pattern, rafters_component.';
        return {
          content: [
            { type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}`, suggestion }) },
          ],
        };
      }
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

  private async loadCompositesFromDir(dir: string): Promise<void> {
    try {
      const entries = await readdir(dir);
      const files = entries.filter((f) => f.endsWith('.composite.json'));

      for (const file of files) {
        try {
          const { readFile } = await import('node:fs/promises');
          const raw = await readFile(join(dir, file), 'utf-8');
          const parsed = JSON.parse(raw);
          const result = CompositeFileSchema.safeParse(parsed);
          if (result.success) {
            try {
              registerComposite(result.data);
            } catch {
              // Already registered
            }
          }
        } catch {
          // Invalid file
        }
      }
    } catch {
      // Directory not found
    }
  }

  private async ensureCompositesLoaded(workspace: Workspace | null): Promise<void> {
    if (!this.builtInCompositesLoaded) {
      const builtInDirs = ['typography'];
      for (const dir of builtInDirs) {
        await this.loadCompositesFromDir(
          join(process.cwd(), 'node_modules/@rafters/composites/src', dir),
        );
      }
      this.builtInCompositesLoaded = true;
    }

    if (workspace && !this.compositesLoadedFor.has(workspace.root)) {
      const paths = getRaftersPaths(workspace.root);
      await this.loadCompositesFromDir(join(paths.root, 'composites'));

      // Gob composites from any extra source dirs the site declared in
      // .rafters/config.rafters.json. Lets a workspace point at a shared
      // composites directory (e.g. packages/shared/src/composites) without
      // duplicating manifests into the site's own composites/.
      const config = await this.readConfig(workspace.root);
      const sources = config?.compositeSources ?? [];
      for (const relativeDir of sources) {
        await this.loadCompositesFromDir(join(workspace.root, relativeDir));
      }

      this.compositesLoadedFor.add(workspace.root);
    }
  }

  private async readConfig(workspaceRoot: string): Promise<RaftersConfig | null> {
    const paths = getRaftersPaths(workspaceRoot);
    try {
      const { readFile } = await import('node:fs/promises');
      const raw = await readFile(paths.config, 'utf-8');
      return JSON.parse(raw) as RaftersConfig;
    } catch {
      return null;
    }
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
    }));

    return { content: [{ type: 'text', text: JSON.stringify({ composites: result }, null, 2) }] };
  }

  private async handleRule(args: Record<string, unknown>): Promise<CallToolResult> {
    const { name, query, create } = args as {
      name?: string;
      query?: string;
      create?: { name: string; description: string; zodSchema: string };
    };

    // Built-in rules
    const builtInRules = [
      { name: 'required', description: 'Field must have a value', source: 'registry' as const },
      { name: 'email', description: 'Must be a valid email address', source: 'registry' as const },
      {
        name: 'password',
        description: 'Password strength requirements',
        source: 'registry' as const,
      },
      { name: 'url', description: 'Must be a valid URL', source: 'registry' as const },
      {
        name: 'credentials',
        description: 'Combined username/password validation',
        source: 'registry' as const,
      },
    ];

    if (create) {
      // TODO: Write rule to local rules directory
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Rule creation not yet implemented',
              suggestion: 'Rules will be written to .rafters/rules/<name>.ts',
            }),
          },
        ],
      };
    }

    let rules = builtInRules;

    if (name) {
      rules = rules.filter((r) => r.name === name);
    } else if (query) {
      const q = query.toLowerCase();
      rules = rules.filter((r) => r.name.includes(q) || r.description.toLowerCase().includes(q));
    }

    return { content: [{ type: 'text', text: JSON.stringify({ rules }, null, 2) }] };
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
