/**
 * MCP Tools for Rafters Design System
 *
 * 4 focused tools for agent composition:
 *
 * 1. rafters_composite - Query composites with designer intent
 * 2. rafters_rule - Query or create validation rules
 * 3. rafters_pattern - Design pattern guidance (do/never)
 * 4. rafters_component - Component intelligence
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
import { registryClient } from '../registry/client.js';
import { getRaftersPaths } from '../utils/paths.js';

// ==================== Tool Definitions ====================

export const TOOL_DEFINITIONS = [
  {
    name: 'rafters_composite',
    description:
      'Query composites by ID, search term, or category. Returns designer intent (solves, appliesWhen, do/never), I/O rules for chaining, and block structure.',
    inputSchema: {
      type: 'object' as const,
      properties: {
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
  private projectRoot: string | null;
  private compositesLoaded = false;

  constructor(projectRoot: string | null) {
    this.projectRoot = projectRoot;
  }

  async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    switch (name) {
      case 'rafters_composite':
        return this.handleComposite(args);
      case 'rafters_rule':
        return this.handleRule(args);
      case 'rafters_pattern':
        return this.handlePattern(args as { solves?: string; query?: string });
      case 'rafters_component':
        return this.handleComponent(args.name as string);
      default:
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
        };
    }
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

  private async ensureCompositesLoaded(): Promise<void> {
    if (this.compositesLoaded) return;

    // Load built-in composites from @rafters/composites
    const builtInDirs = ['typography'];
    for (const dir of builtInDirs) {
      await this.loadCompositesFromDir(
        join(process.cwd(), 'node_modules/@rafters/composites/src', dir),
      );
    }

    // Load project composites if available
    if (this.projectRoot) {
      const paths = getRaftersPaths(this.projectRoot);
      await this.loadCompositesFromDir(join(paths.root, 'composites'));
    }

    this.compositesLoaded = true;
  }

  private async handleComposite(args: Record<string, unknown>): Promise<CallToolResult> {
    await this.ensureCompositesLoaded();

    const { id, query, category } = args as { id?: string; query?: string; category?: string };

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

  private async handlePattern(args: { solves?: string; query?: string }): Promise<CallToolResult> {
    await this.ensureCompositesLoaded();

    const { solves, query } = args;
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
