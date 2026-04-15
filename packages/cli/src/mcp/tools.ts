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

// ==================== Design Patterns ====================

interface DesignPattern {
  name: string;
  intent: string;
  components: string[];
  tokens: { colors: string[]; spacing: string[]; typography?: string[] };
  cognitiveLoad: number;
  accessibility: string;
  trustPattern?: string;
  guidance: { do: string[]; never: string[] };
  example?: string;
}

const DESIGN_PATTERNS: Record<string, DesignPattern> = {
  'destructive-action': {
    name: 'Destructive Action',
    intent: 'Permanent or hard-to-reverse operations requiring user confirmation',
    components: ['alert-dialog', 'button'],
    tokens: { colors: ['destructive', 'destructive-foreground'], spacing: ['4', '6'] },
    cognitiveLoad: 7,
    accessibility:
      'Requires clear focus management, escape to cancel, explicit confirmation button',
    trustPattern:
      'Two-step confirmation. Never auto-focus the destructive button. Cancel should be prominent.',
    guidance: {
      do: [
        'Use AlertDialog for irreversible actions',
        'Describe what will be deleted/changed',
        'Provide clear cancel path',
        'Use destructive variant only for the confirm button',
      ],
      never: [
        'Auto-focus destructive button',
        'Use for reversible actions',
        'Hide the cancel option',
        'Use vague language like "Continue"',
      ],
    },
  },
  'form-validation': {
    name: 'Form Validation',
    intent: 'Inline validation feedback that helps without blocking',
    components: ['field', 'input', 'label', 'button'],
    tokens: {
      colors: ['destructive', 'muted', 'muted-foreground'],
      spacing: ['2', '4'],
      typography: ['sm', 'base'],
    },
    cognitiveLoad: 4,
    accessibility:
      'Error messages must be associated with inputs via aria-describedby. Use aria-invalid on errored inputs.',
    guidance: {
      do: [
        'Show validation on blur or submit, not while typing',
        'Associate error text with input via aria-describedby',
        'Use Field component for consistent error handling',
        'Provide actionable error messages',
      ],
      never: [
        'Validate while user is still typing',
        'Use red color alone to indicate errors',
        'Block form submission without explanation',
        'Use generic error messages',
      ],
    },
  },
  'empty-state': {
    name: 'Empty State',
    intent: 'Guide users when no content exists, provide clear next action',
    components: ['empty', 'button', 'typography'],
    tokens: {
      colors: ['muted', 'muted-foreground', 'primary'],
      spacing: ['6', '8', '12'],
      typography: ['lg', 'base'],
    },
    cognitiveLoad: 2,
    accessibility: 'Empty states should be announced to screen readers with appropriate context',
    guidance: {
      do: [
        'Provide a clear call-to-action',
        'Explain why the state is empty',
        'Use muted tones for illustrations',
        'Keep the message concise',
      ],
      never: [
        'Leave users without guidance',
        'Use alarming language',
        'Hide the empty state',
        'Show multiple competing CTAs',
      ],
    },
  },
  'loading-state': {
    name: 'Loading State',
    intent: 'Indicate progress without causing anxiety or impatience',
    components: ['spinner', 'skeleton', 'progress'],
    tokens: { colors: ['muted', 'primary'], spacing: ['4', '8'] },
    cognitiveLoad: 1,
    accessibility:
      'Use aria-busy on containers, aria-live for status updates. Spinner needs aria-label.',
    guidance: {
      do: [
        'Use Skeleton for known content structure',
        'Use Spinner for unknown duration operations',
        'Use Progress when duration is known',
        'Match skeleton shapes to expected content',
      ],
      never: [
        'Block interaction without feedback',
        'Use spinning animations that cause vestibular issues',
        'Show loading for < 200ms operations',
        'Use multiple spinners in view',
      ],
    },
  },
  'navigation-hierarchy': {
    name: 'Navigation Hierarchy',
    intent: 'Help users understand where they are and where they can go',
    components: ['breadcrumb', 'tabs', 'navigation-menu', 'sidebar'],
    tokens: {
      colors: ['muted-foreground', 'foreground', 'primary'],
      spacing: ['2', '4', '6'],
      typography: ['sm', 'base'],
    },
    cognitiveLoad: 3,
    accessibility:
      'Use nav landmark, aria-current for active items, keyboard navigation between items',
    guidance: {
      do: [
        'Use Breadcrumb for deep hierarchies',
        'Use Tabs for peer-level navigation',
        'Highlight current location clearly',
        'Keep navigation consistent across pages',
      ],
      never: [
        'Mix navigation paradigms',
        'Hide primary navigation',
        'Use more than 3 levels in breadcrumbs',
        'Auto-collapse navigation on desktop',
      ],
    },
  },
  'data-table': {
    name: 'Data Table',
    intent: 'Present structured data with sorting, filtering, and actions',
    components: ['table', 'button', 'dropdown-menu', 'checkbox', 'pagination'],
    tokens: {
      colors: ['muted', 'border', 'foreground'],
      spacing: ['2', '4', '6'],
      typography: ['sm', 'base'],
    },
    cognitiveLoad: 6,
    accessibility: 'Use proper table semantics, scope headers, caption for context',
    guidance: {
      do: [
        'Use semantic table elements',
        'Provide column headers with scope',
        'Support keyboard navigation',
        'Paginate large datasets',
      ],
      never: [
        'Use divs for tabular data',
        'Hide important columns on mobile',
        'Auto-load infinite data without user action',
        'Use tables for layout',
      ],
    },
  },
  'modal-dialog': {
    name: 'Modal Dialog',
    intent: 'Focus user attention on a single task or decision',
    components: ['dialog', 'button'],
    tokens: { colors: ['background', 'foreground', 'border'], spacing: ['4', '6', '8'] },
    cognitiveLoad: 5,
    accessibility:
      'Trap focus inside dialog, return focus on close, ESC to dismiss, aria-modal=true',
    trustPattern: 'Users should always be able to dismiss without consequence',
    guidance: {
      do: [
        'Focus first interactive element on open',
        'Provide clear close mechanism',
        'Keep content focused on one task',
        'Return focus to trigger on close',
      ],
      never: [
        'Stack multiple dialogs',
        'Use for non-blocking information',
        'Prevent dismissal without explicit save',
        'Auto-open dialogs on page load',
      ],
    },
  },
  'tooltip-guidance': {
    name: 'Tooltip Guidance',
    intent: 'Provide contextual help without cluttering the interface',
    components: ['tooltip', 'button'],
    tokens: { colors: ['popover', 'popover-foreground'], spacing: ['2'], typography: ['sm'] },
    cognitiveLoad: 1,
    accessibility: 'Tooltip content must be accessible to keyboard users via focus',
    guidance: {
      do: [
        'Keep tooltip text concise (1-2 sentences)',
        'Trigger on hover AND focus',
        'Use for supplementary information only',
        'Position to avoid obscuring content',
      ],
      never: [
        'Put essential information in tooltips only',
        'Use for error messages',
        'Require click to open',
        'Include interactive elements inside',
      ],
    },
  },
  'card-layout': {
    name: 'Card Layout',
    intent: 'Group related content in scannable, contained units',
    components: ['card', 'button', 'badge', 'avatar'],
    tokens: { colors: ['card', 'card-foreground', 'border'], spacing: ['4', '6'] },
    cognitiveLoad: 2,
    accessibility: 'If card is clickable, entire card should be the click target with clear focus',
    guidance: {
      do: [
        'Use consistent card sizes in grids',
        'Prioritize content hierarchy within cards',
        'Provide clear visual boundaries',
        'Use CardHeader/CardContent for structure',
      ],
      never: [
        'Nest cards within cards',
        'Overload cards with actions',
        'Mix card sizes arbitrarily',
        'Use cards for single pieces of content',
      ],
    },
  },
  'dropdown-actions': {
    name: 'Dropdown Actions',
    intent: 'Provide secondary actions without cluttering the primary interface',
    components: ['dropdown-menu', 'button'],
    tokens: {
      colors: ['popover', 'popover-foreground', 'accent'],
      spacing: ['2', '4'],
      typography: ['sm'],
    },
    cognitiveLoad: 4,
    accessibility: 'Arrow key navigation between items, type-ahead, ESC to close',
    guidance: {
      do: [
        'Group related actions with separators',
        'Use icons consistently (all or none)',
        'Show keyboard shortcuts',
        'Place destructive actions at bottom with separator',
      ],
      never: [
        'Nest dropdowns more than 1 level',
        'Put primary actions in dropdowns',
        'Use dropdowns with fewer than 3 items',
        'Auto-close on any click',
      ],
    },
  },
};

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
      'Get design pattern guidance with do/never rules. Patterns: destructive-action, form-validation, empty-state, loading-state, navigation-hierarchy, data-table, modal-dialog, tooltip-guidance, card-layout, dropdown-actions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description: 'Pattern name',
        },
      },
      required: ['pattern'],
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
        return this.handlePattern(args.pattern as string);
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

  private async handlePattern(patternName: string): Promise<CallToolResult> {
    const pattern = DESIGN_PATTERNS[patternName];

    if (!pattern) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: `Pattern "${patternName}" not found`,
              available: Object.keys(DESIGN_PATTERNS),
            }),
          },
        ],
      };
    }

    return { content: [{ type: 'text', text: JSON.stringify(pattern, null, 2) }] };
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
