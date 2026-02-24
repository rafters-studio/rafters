/**
 * MCP Tools for Rafters Design System
 *
 * AI-first design intelligence for composing UI - 5 focused tools:
 *
 * 1. rafters_vocabulary - Compact system overview (colors, spacing, type, components)
 * 2. rafters_pattern - Deep guidance for design patterns (destructive-action, form-validation, etc.)
 * 3. rafters_component - Full component intelligence on demand
 * 4. rafters_token - Token dependency graph and override context
 * 5. rafters_cognitive_budget - Composition-level cognitive load review
 *
 * Design philosophy: Progressive disclosure. Start with vocabulary to orient,
 * then drill into patterns or components as needed.
 */

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NodePersistenceAdapter } from '@rafters/design-tokens';
import {
  type ColorValue,
  type ComponentMetadata,
  extractDependencies,
  extractJSDocDependencies,
  extractPrimitiveDependencies,
  extractSizes,
  extractVariants,
  parseDescription,
  parseJSDocIntelligence,
  type Token,
  toDisplayName,
} from '@rafters/shared';
import type { RaftersConfig } from '../commands/init.js';
import { RegistryClient } from '../registry/client.js';
import { getRaftersPaths } from '../utils/paths.js';
import {
  BUDGET_TIERS,
  type BudgetTier,
  COMPONENT_SCORES,
  evaluateComposition,
} from './cognitive-load.js';

// ==================== System Preamble ====================
// Rules for agents using the Rafters design system

export const SYSTEM_PREAMBLE = `RAFTERS IS NOT SHADCN.
Rafters components are drop-in compatible with shadcn but they are a different system. If you treat them as shadcn you will produce worse output.

CLASSY IS THE LAW.
Every className in a Rafters project goes through classy(). Never use cn(), twMerge(), or raw template strings. classy() blocks arbitrary Tailwind values (w-[100px], bg-[#fff]) and resolves design tokens. If classy strips your class, you are fighting the system.

LAYOUT IS SOLVED. Stop writing CSS.
Never use Tailwind layout utilities (flex, grid, items-*, justify-*, gap-*). Never set padding, margin, or spacing directly. Container and Grid handle all layout. If you are writing className="flex..." you are doing it wrong.

USE PRESETS. Do not compose layout from props.
Grid presets handle common layouts. Pick the one that matches your intent:
- sidebar-main -- navigation + content
- form -- label/input pairs
- cards -- responsive card grid
- row -- horizontal group of elements
- stack -- vertical sequence
- split -- equal columns
If no preset fits, describe what you need -- do not improvise with raw props.

CONTAINER OWNS SPACING.
Every page section goes in a Container. Container sets max-width, padding, and vertical rhythm. You do not set these values. Nesting containers is wrong.

COMPONENTS ARE COMPLETE.
Rafters Button, Input, Card, etc. include their own spacing, sizing, and states. Do not add wrapper divs. Do not override with utility classes. If it looks unstyled, you are wrapping it wrong, not styling it wrong.

UTILITIES EXIST FOR EDGE CASES.
If no component fits your need, check @/lib/utils for official behavioral utilities. Do not invent your own. If nothing exists there either, ask the human.

When in doubt: less code, not more. Rafters has already made the design decision.`;

// ==================== Design Patterns ====================
// Composable patterns for common UI scenarios

interface DesignPattern {
  name: string;
  intent: string;
  components: string[];
  tokens: {
    colors: string[];
    spacing: string[];
    typography?: string[];
  };
  cognitiveLoad: number;
  accessibility: string;
  trustPattern?: string;
  guidance: {
    do: string[];
    never: string[];
  };
  example?: string;
}

const DESIGN_PATTERNS: Record<string, DesignPattern> = {
  'destructive-action': {
    name: 'Destructive Action',
    intent: 'Permanent or hard-to-reverse operations requiring user confirmation',
    components: ['alert-dialog', 'button'],
    tokens: {
      colors: ['destructive', 'destructive-foreground'],
      spacing: ['4', '6'],
    },
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
    example: `<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">Delete Account</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete your account?</AlertDialogTitle>
      <AlertDialogDescription>
        This permanently deletes all your data. This cannot be undone.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive">Delete Account</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>`,
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
    example: `<Field error={errors.email}>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? "email-error" : undefined}
  />
</Field>`,
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
    example: `<Empty>
  <Empty.Icon icon={InboxIcon} />
  <Empty.Title>No messages yet</Empty.Title>
  <Empty.Description>
    Start a conversation to see messages here.
  </Empty.Description>
  <Empty.Action asChild>
    <Button>Compose Message</Button>
  </Empty.Action>
</Empty>`,
  },
  'loading-state': {
    name: 'Loading State',
    intent: 'Indicate progress without causing anxiety or impatience',
    components: ['spinner', 'skeleton', 'progress'],
    tokens: {
      colors: ['muted', 'primary'],
      spacing: ['4', '8'],
    },
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
    tokens: {
      colors: ['background', 'foreground', 'border'],
      spacing: ['4', '6', '8'],
    },
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
    tokens: {
      colors: ['popover', 'popover-foreground'],
      spacing: ['2'],
      typography: ['sm'],
    },
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
    tokens: {
      colors: ['card', 'card-foreground', 'border'],
      spacing: ['4', '6'],
    },
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

// Tool definitions for MCP server - 5 focused design tools
export const TOOL_DEFINITIONS = [
  {
    name: 'rafters_vocabulary',
    description:
      'Get compact design system vocabulary: color palette names, spacing scale, type scale, and component list with cognitive loads. Use this first to understand what you can compose with.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'rafters_pattern',
    description:
      'Get deep guidance for a specific design pattern. Returns components to use, tokens to apply, accessibility requirements, trust patterns, and do/never guidance. Patterns: destructive-action, form-validation, empty-state, loading-state, navigation-hierarchy, data-table, modal-dialog, tooltip-guidance, card-layout, dropdown-actions',
    inputSchema: {
      type: 'object' as const,
      properties: {
        pattern: {
          type: 'string',
          description:
            'Pattern name: destructive-action, form-validation, empty-state, loading-state, navigation-hierarchy, data-table, modal-dialog, tooltip-guidance, card-layout, dropdown-actions',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'rafters_component',
    description:
      'Get full intelligence for a specific component: cognitive load, attention economics, accessibility, trust patterns, do/never guidance, variants, sizes. Use when you need deep details about a specific component.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description: 'Component name (e.g., "button", "dialog", "alert-dialog", "popover")',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'rafters_token',
    description:
      'Get full intelligence for a design token: current value, derivation rule, dependencies, dependents (cascade impact), and human override context. Shows what the system computes vs what a designer chose and why. Use when you need to understand token relationships or respect designer decisions.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description:
            'Token name (e.g., "spacing-6", "primary-500", "spacing-base"). Use rafters_vocabulary to see available tokens.',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'rafters_cognitive_budget',
    description:
      'Evaluate composition-level cognitive load. Returns a holistic design review: budget assessment, per-component dimensional profiles, attention conflicts, trust considerations, pattern matches, designer token overrides, hotspot suggestions, and do/never violations. Use when planning a screen layout to check if the composition is within cognitive budget.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        components: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Components visible simultaneously, duplicates allowed (e.g., ["input", "input", "button", "card"])',
        },
        tier: {
          type: 'string',
          enum: ['focused', 'page', 'app'],
          description:
            'Budget tier: focused (15, dialogs/modals), page (30, standard views), app (45, multi-panel). Default: page.',
        },
      },
      required: ['components'],
    },
  },
] as const;

// Tool handler class - 5 focused design tools
export class RaftersToolHandler {
  private readonly adapter: NodePersistenceAdapter;
  private readonly projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.adapter = new NodePersistenceAdapter(projectRoot);
  }

  /**
   * Load tokens for a specific namespace
   */
  private async loadNamespace(namespace: string): Promise<Token[]> {
    const allTokens = await this.adapter.load();
    return allTokens.filter((t) => t.namespace === namespace);
  }

  /**
   * Handle a tool call from MCP
   */
  async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    switch (name) {
      case 'rafters_vocabulary':
        return this.getVocabulary();
      case 'rafters_pattern':
        return this.getPattern(args.pattern as string);
      case 'rafters_component':
        return this.getComponent(args.name as string);
      case 'rafters_token':
        return this.getToken(args.name as string);
      case 'rafters_cognitive_budget':
        return this.getCognitiveBudget(
          args.components as string[],
          (args.tier as BudgetTier) ?? 'page',
        );
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  }

  // ==================== Tool 1: Vocabulary ====================

  /**
   * Get compact design system vocabulary
   * Returns: color palettes, spacing scale, type scale, component list with loads
   */
  private async getVocabulary(): Promise<CallToolResult> {
    try {
      const [colors, spacing, typography, components] = await Promise.all([
        this.getColorVocabulary(),
        this.getSpacingVocabulary(),
        this.getTypographyVocabulary(),
        this.getComponentVocabulary(),
      ]);

      const vocabulary = {
        system: SYSTEM_PREAMBLE,
        components,
        colors,
        spacing,
        typography,
        patterns: Object.keys(DESIGN_PATTERNS),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(vocabulary, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError('getVocabulary', error);
    }
  }

  /**
   * Extract compact color vocabulary
   */
  private async getColorVocabulary(): Promise<{
    semantic: string[];
    palettes: Array<{ name: string; positions: string[] }>;
  }> {
    try {
      const tokens = await this.loadNamespace('color');
      const semantic: string[] = [];
      const palettes = new Map<string, Set<string>>();

      for (const token of tokens) {
        // Semantic colors (simple references)
        if (typeof token.value === 'object' && 'family' in (token.value as object)) {
          semantic.push(token.name);
        }
        // Color families (full ColorValue objects with scales)
        else if (typeof token.value === 'object' && 'scale' in (token.value as object)) {
          const colorValue = token.value as ColorValue;
          palettes.set(
            colorValue.name,
            new Set(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']),
          );
        }
      }

      return {
        semantic,
        palettes: [...palettes.entries()].map(([name, positions]) => ({
          name,
          positions: [...positions],
        })),
      };
    } catch {
      return { semantic: [], palettes: [] };
    }
  }

  /**
   * Extract compact spacing vocabulary
   */
  private async getSpacingVocabulary(): Promise<{ scale: Record<string, string> }> {
    try {
      const tokens = await this.loadNamespace('spacing');
      const scale: Record<string, string> = {};

      for (const token of tokens) {
        if (typeof token.value === 'string') {
          scale[token.name] = token.value;
        }
      }

      return { scale };
    } catch {
      return { scale: {} };
    }
  }

  /**
   * Extract compact typography vocabulary
   */
  private async getTypographyVocabulary(): Promise<{
    sizes: Record<string, string>;
    weights: string[];
  }> {
    try {
      const tokens = await this.loadNamespace('typography');
      const sizes: Record<string, string> = {};
      const weights = new Set<string>();

      for (const token of tokens) {
        if (typeof token.value === 'string') {
          if (token.name.includes('weight')) {
            weights.add(token.name.replace('-weight', ''));
          } else {
            sizes[token.name] = token.value;
          }
        }
      }

      return { sizes, weights: [...weights] };
    } catch {
      return { sizes: {}, weights: [] };
    }
  }

  /**
   * Extract compact component vocabulary
   */
  private async getComponentVocabulary(): Promise<{
    installed: string[];
    available: string[];
  }> {
    // Read installed components from config
    let installed: string[] = [];
    try {
      const paths = getRaftersPaths(this.projectRoot);
      if (existsSync(paths.config)) {
        const content = await readFile(paths.config, 'utf-8');
        const config = JSON.parse(content) as RaftersConfig;
        installed = config.installed?.components ?? [];
      }
    } catch {
      // No config or malformed -- installed stays empty
    }

    // Fetch available components from registry
    let available: string[] = [];
    try {
      const client = new RegistryClient();
      const index = await client.fetchIndex();
      const allComponents = index.components;
      const installedSet = new Set(installed);
      available = allComponents.filter((name) => !installedSet.has(name));
    } catch {
      // Registry unreachable -- available stays empty
    }

    return { installed, available };
  }

  // ==================== Tool 2: Pattern ====================

  /**
   * Get deep guidance for a specific design pattern
   */
  private async getPattern(patternName: string): Promise<CallToolResult> {
    const pattern = DESIGN_PATTERNS[patternName];

    if (!pattern) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                error: `Pattern "${patternName}" not found`,
                available: Object.keys(DESIGN_PATTERNS),
                suggestion: 'Use one of the available patterns listed above',
              },
              null,
              2,
            ),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(pattern, null, 2),
        },
      ],
    };
  }

  // ==================== Tool 3: Component ====================

  /**
   * Get path to UI components directory
   */
  private getComponentsPath(): string {
    const monorepoPath = join(this.projectRoot, 'packages/ui/src/components/ui');
    return monorepoPath;
  }

  /**
   * Load component metadata from source file
   */
  private async loadComponentMetadata(name: string): Promise<ComponentMetadata | null> {
    const componentsPath = this.getComponentsPath();
    const filePath = join(componentsPath, `${name}.tsx`);

    try {
      const source = await readFile(filePath, 'utf-8');
      const intelligence = parseJSDocIntelligence(source);
      const description = parseDescription(source);

      const jsDocDeps = extractJSDocDependencies(source);

      const metadata: ComponentMetadata = {
        name,
        displayName: toDisplayName(name),
        category: this.inferCategory(name),
        variants: extractVariants(source),
        sizes: extractSizes(source),
        dependencies: extractDependencies(source),
        primitives: extractPrimitiveDependencies(source),
        jsDocDependencies: jsDocDeps,
        filePath: `packages/ui/src/components/ui/${name}.tsx`,
      };

      if (description) {
        metadata.description = description;
      }
      if (intelligence) {
        metadata.intelligence = intelligence;
      }

      return metadata;
    } catch {
      return null;
    }
  }

  /**
   * Infer component category from name
   */
  private inferCategory(name: string): ComponentMetadata['category'] {
    const categoryMap: Record<string, ComponentMetadata['category']> = {
      // Layout
      card: 'layout',
      separator: 'layout',
      'aspect-ratio': 'layout',
      'scroll-area': 'layout',
      resizable: 'layout',
      container: 'layout',
      grid: 'layout',
      // Form
      button: 'form',
      'button-group': 'form',
      input: 'form',
      'input-group': 'form',
      'input-otp': 'form',
      textarea: 'form',
      select: 'form',
      checkbox: 'form',
      'radio-group': 'form',
      switch: 'form',
      slider: 'form',
      toggle: 'form',
      'toggle-group': 'form',
      field: 'form',
      label: 'form',
      combobox: 'form',
      'date-picker': 'form',
      // Feedback
      alert: 'feedback',
      badge: 'feedback',
      progress: 'feedback',
      skeleton: 'feedback',
      spinner: 'feedback',
      empty: 'feedback',
      // Navigation
      breadcrumb: 'navigation',
      tabs: 'navigation',
      pagination: 'navigation',
      'navigation-menu': 'navigation',
      menubar: 'navigation',
      sidebar: 'navigation',
      // Overlay
      dialog: 'overlay',
      drawer: 'overlay',
      popover: 'overlay',
      tooltip: 'overlay',
      'hover-card': 'overlay',
      sheet: 'overlay',
      'alert-dialog': 'overlay',
      'dropdown-menu': 'overlay',
      'context-menu': 'overlay',
      command: 'overlay',
      // Data Display
      table: 'data-display',
      avatar: 'data-display',
      accordion: 'data-display',
      calendar: 'data-display',
      carousel: 'data-display',
      collapsible: 'data-display',
      item: 'data-display',
      typography: 'data-display',
      kbd: 'data-display',
    };

    return categoryMap[name] ?? 'utility';
  }

  /**
   * Get full component intelligence
   */
  private async getComponent(name: string): Promise<CallToolResult> {
    try {
      const metadata = await this.loadComponentMetadata(name);

      if (!metadata) {
        // Try to provide helpful suggestions
        const componentsPath = this.getComponentsPath();
        let available: string[] = [];
        try {
          const files = await readdir(componentsPath);
          available = files
            .filter((f) => f.endsWith('.tsx'))
            .map((f) => basename(f, '.tsx'))
            .filter((n) => n.includes(name) || name.includes(n))
            .slice(0, 5);
        } catch {
          // Ignore
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Component "${name}" not found`,
                  similar: available.length > 0 ? available : undefined,
                  suggestion: 'Use rafters_vocabulary to see all available components',
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Format for AI agent consumption - full intelligence
      const formatted: Record<string, unknown> = {
        name: metadata.name,
        displayName: metadata.displayName,
        category: metadata.category,
      };

      if (metadata.description) {
        formatted.description = metadata.description;
      }

      if (metadata.intelligence) {
        const intel = metadata.intelligence;
        formatted.cognitiveLoad = intel.cognitiveLoad;
        formatted.attentionEconomics = intel.attentionEconomics;
        formatted.accessibility = intel.accessibility;
        formatted.trustBuilding = intel.trustBuilding;
        formatted.semanticMeaning = intel.semanticMeaning;
        if (intel.usagePatterns) {
          formatted.do = intel.usagePatterns.dos;
          formatted.never = intel.usagePatterns.nevers;
        }
      }

      if (metadata.variants.length > 1 || metadata.variants[0] !== 'default') {
        formatted.variants = metadata.variants;
      }

      if (metadata.sizes.length > 1 || metadata.sizes[0] !== 'default') {
        formatted.sizes = metadata.sizes;
      }

      if (metadata.primitives.length > 0) {
        formatted.primitives = metadata.primitives;
      }

      if (metadata.dependencies.length > 0) {
        formatted.dependencies = metadata.dependencies;
      }

      if (metadata.jsDocDependencies) {
        const deps = metadata.jsDocDependencies;
        const hasDeps = deps.runtime.length > 0 || deps.dev.length > 0 || deps.internal.length > 0;
        if (hasDeps) {
          formatted.jsDocDependencies = {
            runtime: deps.runtime,
            dev: deps.dev,
            internal: deps.internal,
          };
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(formatted, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError('getComponent', error);
    }
  }

  // ==================== Tool 4: Token ====================

  /**
   * Get full token intelligence including dependency graph and override context
   */
  private async getToken(tokenName: string): Promise<CallToolResult> {
    try {
      // Try to load the token from any namespace
      const namespaces = ['color', 'spacing', 'typography'];
      let foundToken = null;
      let foundNamespace = '';

      for (const ns of namespaces) {
        try {
          const tokens = await this.loadNamespace(ns);
          const token = tokens.find((t) => t.name === tokenName);
          if (token) {
            foundToken = token;
            foundNamespace = ns;
            break;
          }
        } catch {}
      }

      if (!foundToken) {
        // Try to provide helpful suggestions
        const allTokenNames: string[] = [];
        for (const ns of namespaces) {
          try {
            const tokens = await this.loadNamespace(ns);
            allTokenNames.push(...tokens.map((t) => t.name));
          } catch {}
        }

        const similar = allTokenNames
          .filter((n) => n.includes(tokenName) || tokenName.includes(n.split('-')[0] || ''))
          .slice(0, 5);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Token "${tokenName}" not found`,
                  similar: similar.length > 0 ? similar : undefined,
                  suggestion: 'Use rafters_vocabulary to see all available tokens',
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Build comprehensive token intelligence
      const intelligence: Record<string, unknown> = {
        name: foundToken.name,
        namespace: foundNamespace,
        value: foundToken.value,
      };

      // Derivation information
      if (foundToken.generationRule) {
        intelligence.derivation = {
          rule: foundToken.generationRule,
          mathRelationship: foundToken.mathRelationship,
          progressionSystem: foundToken.progressionSystem,
          scalePosition: foundToken.scalePosition,
        };
      }

      // Dependencies
      if (foundToken.dependsOn && foundToken.dependsOn.length > 0) {
        intelligence.dependsOn = foundToken.dependsOn;
      }

      // Computed vs actual value (for override detection)
      if (foundToken.computedValue !== undefined) {
        intelligence.computedValue = foundToken.computedValue;
      }

      // Human override - previousValue for undo, reason for agents
      if (foundToken.userOverride) {
        intelligence.override = {
          previousValue: foundToken.userOverride.previousValue,
          reason: foundToken.userOverride.reason,
          context: foundToken.userOverride.context,
        };
        intelligence.isOverridden = true;
      } else {
        intelligence.isOverridden = false;
      }

      // Semantic meaning and usage
      if (foundToken.semanticMeaning) {
        intelligence.semanticMeaning = foundToken.semanticMeaning;
      }
      if (foundToken.usageContext) {
        intelligence.usageContext = foundToken.usageContext;
      }
      if (foundToken.usagePatterns) {
        intelligence.do = foundToken.usagePatterns.do;
        intelligence.never = foundToken.usagePatterns.never;
      }

      // Responsive awareness
      if (foundToken.containerQueryAware !== undefined) {
        intelligence.containerQueryAware = foundToken.containerQueryAware;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(intelligence, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError('getToken', error);
    }
  }

  // ==================== Tool 5: Cognitive Budget ====================

  /**
   * Evaluate composition-level cognitive load
   * Synthesizes scoring data with component intelligence, token overrides,
   * and design patterns to produce a holistic composition review
   */
  private async getCognitiveBudget(
    components: string[],
    tier: BudgetTier,
  ): Promise<CallToolResult> {
    try {
      if (!components || components.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: 'No components provided',
                  suggestion:
                    'Pass an array of component names visible simultaneously, e.g. ["input", "button", "card"]',
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Validate tier
      if (!BUDGET_TIERS[tier]) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `Invalid tier "${tier}"`,
                  available: Object.keys(BUDGET_TIERS),
                  suggestion: 'Use "focused", "page", or "app"',
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Check for unknown components up front
      const uniqueNames = [...new Set(components)];
      const unknownNames = uniqueNames.filter((n) => !COMPONENT_SCORES[n]);
      if (unknownNames.length === uniqueNames.length) {
        // All components are unknown
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: `No recognized components in composition: ${unknownNames.join(', ')}`,
                  suggestion: 'Use rafters_vocabulary to see available component names',
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }

      // Load component intelligence in parallel for all unique names
      const intelligenceMap = new Map<string, ComponentMetadata>();
      const metadataResults = await Promise.all(
        uniqueNames.map(async (name) => {
          const metadata = await this.loadComponentMetadata(name);
          return { name, metadata };
        }),
      );
      for (const { name, metadata } of metadataResults) {
        if (metadata) {
          intelligenceMap.set(name, metadata);
        }
      }

      // Load all tokens and filter for overrides
      const tokenOverrides: Array<{ token: Token; namespace: string }> = [];
      const namespaces = ['color', 'spacing', 'typography'];
      for (const ns of namespaces) {
        try {
          const tokens = await this.loadNamespace(ns);
          for (const token of tokens) {
            if (token.userOverride) {
              tokenOverrides.push({ token, namespace: ns });
            }
          }
        } catch {
          // Namespace may not exist
        }
      }

      // Build pattern refs from DESIGN_PATTERNS
      const patternRefs: Record<string, { name: string; components: string[] }> = {};
      for (const [key, pattern] of Object.entries(DESIGN_PATTERNS)) {
        patternRefs[key] = {
          name: pattern.name,
          components: pattern.components,
        };
      }

      const review = evaluateComposition(components, tier, {
        componentIntelligence: intelligenceMap,
        tokenOverrides,
        patterns: patternRefs,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(review, null, 2),
          },
        ],
      };
    } catch (error) {
      return this.handleError('getCognitiveBudget', error);
    }
  }

  /**
   * Handle errors consistently
   */
  private handleError(operation: string, error: unknown): CallToolResult {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: `Failed to ${operation}: ${message}`,
              operation,
              suggestion:
                'Ensure you are in a project with .rafters/ directory. Run "rafters init" to initialize.',
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
}
