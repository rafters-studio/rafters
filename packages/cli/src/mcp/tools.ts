/**
 * MCP Tools for Rafters Design System
 *
 * 5 focused tools for agent composition:
 *
 * 1. rafters_vocabulary - Query design system vocabulary with filters
 * 2. rafters_composite - Query composites with designer intent
 * 3. rafters_rule - Query or create validation rules
 * 4. rafters_pattern - Design pattern guidance (do/never)
 * 5. rafters_component - Component intelligence
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
    name: 'rafters_vocabulary',
    description:
      'Query design system vocabulary: colors, spacing, typography, components. Use filters to narrow results. Empty call returns compact index with suggested queries.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        category: {
          type: 'string',
          enum: ['color', 'spacing', 'typography', 'component'],
          description: 'Filter by token category',
        },
        intent: {
          type: 'string',
          description:
            'Semantic search: "warnings", "text colors", "error states", "primary actions"',
        },
        family: {
          type: 'string',
          description: 'Color family filter: "primary", "destructive", "success", "warning", etc.',
        },
      },
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
      case 'rafters_vocabulary':
        return this.handleVocabulary(
          args as { category?: string; intent?: string; family?: string },
        );
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

  private async handleVocabulary(args: {
    category?: string;
    intent?: string;
    family?: string;
  }): Promise<CallToolResult> {
    const { category, intent, family } = args;

    // Color families available in the system
    const colorFamilies = [
      'primary',
      'secondary',
      'tertiary',
      'accent',
      'destructive',
      'success',
      'warning',
      'info',
      'muted',
      'highlight',
      'neutral',
    ];

    // Spacing scale
    const spacingScale = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'];

    // Typography scale
    const typographyScale = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];

    // Components available
    const components = [
      'accordion',
      'alert',
      'alert-dialog',
      'avatar',
      'badge',
      'button',
      'card',
      'checkbox',
      'collapsible',
      'command',
      'context-menu',
      'dialog',
      'dropdown-menu',
      'form',
      'hover-card',
      'input',
      'label',
      'menubar',
      'navigation-menu',
      'popover',
      'progress',
      'radio-group',
      'scroll-area',
      'select',
      'separator',
      'sheet',
      'skeleton',
      'slider',
      'switch',
      'table',
      'tabs',
      'textarea',
      'toast',
      'toggle',
      'toggle-group',
      'tooltip',
    ];

    // Intent mappings for semantic search
    const intentMappings: Record<string, { families?: string[]; description: string }> = {
      warnings: { families: ['warning'], description: 'Attention-requiring states' },
      errors: { families: ['destructive'], description: 'Error and failure states' },
      success: { families: ['success'], description: 'Success and completion states' },
      info: { families: ['info'], description: 'Informational messages' },
      'text colors': { families: ['neutral', 'primary'], description: 'Text and typography' },
      'primary actions': { families: ['primary', 'accent'], description: 'Call-to-action buttons' },
      'destructive actions': { families: ['destructive'], description: 'Dangerous operations' },
      danger: { families: ['destructive'], description: 'Dangerous or destructive states' },
      muted: { families: ['muted'], description: 'De-emphasized content' },
      highlight: { families: ['highlight'], description: 'Emphasized content' },
    };

    // No params: return compact index with suggested queries
    if (!category && !intent && !family) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                index: {
                  colors: colorFamilies,
                  spacing: spacingScale,
                  typography: typographyScale,
                  components: components.slice(0, 10),
                  componentCount: components.length,
                },
                suggestedQueries: [
                  { intent: 'warnings', description: 'Get warning/alert colors' },
                  { intent: 'text colors', description: 'Get text and typography colors' },
                  { intent: 'primary actions', description: 'Get CTA button colors' },
                  { family: 'destructive', description: 'Get destructive/error colors' },
                  { category: 'spacing', description: 'Get spacing scale' },
                  { category: 'component', description: 'List all components' },
                ],
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Category filter
    if (category) {
      switch (category) {
        case 'color':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    category: 'color',
                    families: colorFamilies,
                    scales: [
                      '50',
                      '100',
                      '200',
                      '300',
                      '400',
                      '500',
                      '600',
                      '700',
                      '800',
                      '900',
                      '950',
                    ],
                    semanticRoles: ['foreground', 'background', 'border'],
                    usage: 'Use family-scale format: primary-500, destructive-foreground',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        case 'spacing':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    category: 'spacing',
                    scale: spacingScale,
                    usage: 'Use Tailwind utilities: p-4, m-2, gap-6',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        case 'typography':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    category: 'typography',
                    sizes: typographyScale,
                    weights: ['normal', 'medium', 'semibold', 'bold'],
                    families: ['sans', 'serif', 'mono'],
                    usage: 'Use Tailwind utilities: text-lg, font-semibold',
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        case 'component':
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ category: 'component', components }, null, 2),
              },
            ],
          };
        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Unknown category: ${category}`,
                  available: ['color', 'spacing', 'typography', 'component'],
                }),
              },
            ],
          };
      }
    }

    // Intent filter - semantic search
    if (intent) {
      const intentLower = intent.toLowerCase();
      const matched = Object.entries(intentMappings).find(
        ([key]) => intentLower.includes(key) || key.includes(intentLower),
      );

      if (matched) {
        const [matchedIntent, info] = matched;
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  intent: matchedIntent,
                  description: info.description,
                  families: info.families,
                  tokens: info.families?.flatMap((f) => [
                    `${f}-500`,
                    `${f}-foreground`,
                    `${f}-background`,
                  ]),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `No tokens found for intent: ${intent}`,
              suggestedIntents: Object.keys(intentMappings),
            }),
          },
        ],
      };
    }

    // Family filter
    if (family) {
      const familyLower = family.toLowerCase();
      if (colorFamilies.includes(familyLower)) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  family: familyLower,
                  tokens: {
                    scale: [
                      `${familyLower}-50`,
                      `${familyLower}-100`,
                      `${familyLower}-200`,
                      `${familyLower}-300`,
                      `${familyLower}-400`,
                      `${familyLower}-500`,
                      `${familyLower}-600`,
                      `${familyLower}-700`,
                      `${familyLower}-800`,
                      `${familyLower}-900`,
                      `${familyLower}-950`,
                    ],
                    semantic: [
                      `${familyLower}-foreground`,
                      `${familyLower}-background`,
                      `${familyLower}-border`,
                    ],
                  },
                  usage: `Use with Tailwind: bg-${familyLower}-500, text-${familyLower}-foreground`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Unknown color family: ${family}`,
              available: colorFamilies,
            }),
          },
        ],
      };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({ error: 'No valid filter provided' }) }],
    };
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
