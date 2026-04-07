/**
 * MCP Tools for Rafters Design System
 *
 * AI-first design intelligence for composing UI - 6 focused tools:
 *
 * 1. rafters_vocabulary - Compact system overview (colors, spacing, type, components)
 * 2. rafters_pattern - Deep guidance for design patterns (destructive-action, form-validation, etc.)
 * 3. rafters_component - Full component intelligence on demand
 * 4. rafters_token - Read/write tokens with why-gate, dependency cascade, output regeneration
 * 5. rafters_cognitive_budget - Composition-level cognitive load review
 * 6. rafters_onboard - Analyze existing CSS and map design decisions into tokens
 *
 * Design philosophy: Progressive disclosure. Start with vocabulary to orient,
 * then drill into patterns or components as needed.
 */

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { buildColorValue, hexToOKLCH, oklchToCSS } from '@rafters/color-utils';
import {
  DEFAULT_FONT_WEIGHTS,
  DEFAULT_SEMANTIC_COLOR_MAPPINGS,
  DEFAULT_SPACING_MULTIPLIERS,
  DEFAULT_TYPOGRAPHY_SCALE,
  NodePersistenceAdapter,
  registryToTailwind,
  registryToTypeScript,
  TokenRegistry,
  toDTCG,
} from '@rafters/design-tokens';
import {
  COMPUTED,
  type ColorValue,
  type ComponentMetadata,
  extractDependencies,
  extractJSDocDependencies,
  extractPrimitiveDependencies,
  extractSizes,
  extractVariants,
  type JSDocDependencies,
  type OKLCH,
  parseDescription,
  parseJSDocIntelligence,
  type Token,
  toDisplayName,
} from '@rafters/shared';
import type { RaftersConfig } from '../commands/init.js';
import { registryClient } from '../registry/client.js';
import {
  COMPONENT_EXTENSIONS,
  resolveComponentTarget,
  targetToExtension,
} from '../utils/detect.js';
import { getRaftersPaths } from '../utils/paths.js';
import {
  BUDGET_TIERS,
  type BudgetTier,
  COMPONENT_SCORES,
  evaluateComposition,
} from './cognitive-load.js';

// ==================== Helpers ====================

/** Check whether a JSDocDependencies object has any non-empty arrays */
function hasAnyDeps(deps: JSDocDependencies): boolean {
  return deps.runtime.length > 0 || deps.dev.length > 0 || deps.internal.length > 0;
}

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

COLORS ARE TAILWIND CLASSES.
Write border-l-primary, bg-success, text-info-foreground. Do not create color constants, mapping objects, or reference palette names. Palette families are internal. See quickstart.colorTokens for the full list of semantic tokens and usage examples.

ONBOARDING IS INTENTIONAL.
When onboarding an existing project, do NOT skip the learning step.
1. Call rafters_vocabulary and explore token shapes first. Understand namespaces, dependency graph, the two primitives.
2. Call rafters_onboard analyze to see what existing design decisions are in the CSS.
3. Do NOT automatically map colors. Ask the designer about each ambiguous decision.
4. CHALLENGE SEMANTIC ASSIGNMENTS. Do not accept "this is primary" without asking why. "What makes this the primary identity color? Where is it used? What role does it play?" The designer must justify every family assignment.
5. Every token mutation needs a reason that captures design INTENT, not just origin.
   Bad: "imported from globals.css"
   Good: "Brand blue from --brand-primary, primary identity color used on nav and CTAs per designer"
6. The 11 semantic families (primary, secondary, tertiary, accent, neutral, success, warning, destructive, info, highlight, muted) MUST all be mapped. Extra colors are custom families in the color namespace.
7. If analyze detects color scale patterns (e.g., --color-blaze-50 through --color-blaze-950), map the family using its base color. Do NOT create 11 individual tokens.
8. Call rafters_onboard map to execute the migration once the designer confirms. Colors are automatically enriched with full OKLCH scales, harmonies, accessibility data, and API intelligence.
9. AFTER mapping color families, check if semantic surface tokens (background, foreground, card, popover, etc.) need remapping. By default they reference "neutral" family. For dark-themed sites or custom palettes, remap them using the "light" and "dark" fields in the mapping: { source: "--bg", target: "background", light: "neutral-50", dark: "custom-dark-950", reason: "..." }. The light/dark values are "family-position" references to existing color tokens. Map color families FIRST, then remap semantic tokens that reference them.

When in doubt: less code, not more. Rafters has already made the design decision.`;

// ==================== Consumer Quickstart ====================
// Onboarding guidance that prevents common consumer mistakes

export const CONSUMER_QUICKSTART = {
  rule1:
    'Components are pre-styled. Import and render. Do not add className for visual styling -- only for layout context (e.g. border-l-4 for accent). Input knows its focus ring. Label knows its weight. You arrange, you do not style.',
  rule2:
    'Colors are Tailwind classes. Write border-l-primary, bg-success, text-info-foreground. Do not create color constants, mapping objects, or reference palette internals.',
  rule3:
    'Layout uses Container and Grid presets (sidebar-main, form, cards, row, stack, split). Do not write flex, grid, gap-* directly.',
  antiPatterns: [
    'Do NOT reference palette families (silver-true-sky-500, neutral-400). Those are internal.',
    'Do NOT add className to Input/Label/Select for styling. They handle their own styles.',
    'Do NOT create wrapper components that add styling to Rafters components.',
    'Do NOT define focus states, hover states, or error states. Components include these.',
    'Do NOT create color mapping objects. The Tailwind class name IS the mapping.',
  ],
  colorTokens: {
    semantic: [
      'primary -- Main brand, CTA buttons, links',
      'secondary -- Less prominent actions',
      'accent -- Hover highlights, emphasis',
      'muted -- Subdued backgrounds, disabled text',
      'destructive -- Delete, remove, errors',
      'success -- Confirmations, positive feedback',
      'warning -- Caution, important notices',
      'info -- Tips, help, neutral information',
    ],
    categorical:
      'chart-1 through chart-5 -- For data viz and categorical distinction (guaranteed harmonious)',
    structural: 'card, popover, border, input, ring -- Surface and boundary tokens',
    usage:
      'Use as Tailwind class fragments: bg-primary, text-info-foreground, border-l-success. Each token has a -foreground variant for text on that background.',
  },
};

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
      'Get design system vocabulary with consumer quickstart guide. Returns: system rules, onboarding guidance (what to do and what NOT to do), semantic color tokens, spacing scale, type scale, layout presets, and component list. ALWAYS call this first before building with Rafters.',
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
      'Read or write a design token. Read: returns full intelligence (value, derivation, dependencies, cascade impact, override context). Write: set/create/reset tokens with mandatory reason (why-gate). Every write cascades through the dependency graph, persists to disk, and regenerates CSS/TS/DTCG outputs.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: {
          type: 'string',
          description:
            'Token name (e.g., "spacing-6", "primary-500", "spacing-base"). Use rafters_vocabulary to see available tokens.',
        },
        action: {
          type: 'string',
          enum: ['get', 'set', 'create', 'reset'],
          description:
            'Action to perform. get (default): read token intelligence. set: update existing token value. create: add a new token. reset: clear override, restore computed value.',
        },
        value: {
          type: 'string',
          description: 'New token value (required for set and create actions).',
        },
        reason: {
          type: 'string',
          description:
            'Why this change is being made (required for set, create, and reset). Every mutation needs a reason that captures design INTENT.',
        },
        namespace: {
          type: 'string',
          description:
            'Token namespace (required for create). E.g., "color", "spacing", "typography".',
        },
        category: {
          type: 'string',
          description: 'Token category (required for create). E.g., "color", "spacing", "font".',
        },
        dark: {
          type: 'string',
          description:
            'Dark mode color reference as "family-position" (e.g., "neutral-950"). For semantic tokens, sets dependsOn[1] so the CSS dark mode layer uses this reference instead of the light value.',
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
  {
    name: 'rafters_onboard',
    description:
      'Analyze an existing project for design decisions and map them into Rafters tokens. Use "analyze" to surface raw findings. Use "map" to execute -- but map REQUIRES the designer to confirm every mapping first. The tool will reject unconfirmed mappings and instruct you to ask the designer. Supports two mapping types: (1) color family mapping with "value" field (enriches CSS color into full ColorValue), (2) semantic remapping with "light"/"dark" fields (remaps which color family+position a semantic token like "background" or "card" references for light/dark mode). Map color families first, then remap semantic surface tokens.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['analyze', 'map', 'status'],
          description:
            'analyze: scan CSS and return findings + family checklist. status: show which of the 11 families have designer decisions vs defaults. map: execute confirmed mappings (requires confirmed: true after designer review).',
        },
        confirmed: {
          type: 'boolean',
          description:
            'Set to true ONLY after the designer has reviewed and approved every mapping. The reasons must come from the designer, not from you.',
        },
        mappings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              source: {
                type: 'string',
                description: 'Original CSS variable name (e.g., "--brand-blue")',
              },
              target: {
                type: 'string',
                description: 'Rafters token name to set or create (e.g., "primary")',
              },
              value: {
                type: 'string',
                description:
                  'The CSS color value to set (from the original CSS). Required for color family mappings. Omit for semantic remappings that use light/dark instead.',
              },
              light: {
                type: 'string',
                description:
                  'Light mode color reference as "family-position" (e.g., "neutral-50"). Used for semantic token remapping -- tells the token which color family+position to use in light mode.',
              },
              dark: {
                type: 'string',
                description:
                  'Dark mode color reference as "family-position" (e.g., "neutral-950"). Used for semantic token remapping -- tells the token which color family+position to use in dark mode.',
              },
              reason: {
                type: 'string',
                description:
                  'The designer explains why this mapping makes sense. This must come from the human, not from you. Ask them.',
              },
              namespace: {
                type: 'string',
                description: 'Namespace for new tokens (required if token does not exist)',
              },
              category: {
                type: 'string',
                description: 'Category for new tokens (required if token does not exist)',
              },
            },
            required: ['source', 'target', 'reason'],
          },
          description: 'Array of mappings to execute (required for map action)',
        },
      },
      required: ['action'],
    },
  },
] as const;

const NO_PROJECT_ERROR =
  'No .rafters/ config found. Run `pnpm dlx rafters init` in your project first. ' +
  'If the MCP server was launched from a different directory, pass --project-root <path>.';

// Tools that work without a project root (static data only)
const PROJECT_INDEPENDENT_TOOLS = new Set(['rafters_pattern']);

// Tool handler class - 6 focused design tools
export class RaftersToolHandler {
  private readonly adapter: NodePersistenceAdapter | null;
  private readonly projectRoot: string | null;
  private cachedConfig: RaftersConfig | null | undefined;

  constructor(projectRoot: string | null) {
    this.projectRoot = projectRoot;
    this.adapter = projectRoot ? new NodePersistenceAdapter(projectRoot) : null;
  }

  /**
   * Load tokens for a specific namespace
   */
  private async loadNamespace(namespace: string): Promise<Token[]> {
    if (!this.adapter) return [];
    const allTokens = await this.adapter.load();
    return allTokens.filter((t) => t.namespace === namespace);
  }

  /**
   * Handle a tool call from MCP
   */
  async handleToolCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    if (!this.projectRoot && !PROJECT_INDEPENDENT_TOOLS.has(name)) {
      return { content: [{ type: 'text', text: NO_PROJECT_ERROR }], isError: true };
    }

    switch (name) {
      case 'rafters_vocabulary':
        return this.getVocabulary();
      case 'rafters_pattern':
        return this.getPattern(args.pattern as string);
      case 'rafters_component':
        return this.getComponent(args.name as string);
      case 'rafters_token': {
        const action = (args.action as string) ?? 'get';
        if (action === 'get') return this.getToken(args.name as string);
        return this.writeToken(action, args);
      }
      case 'rafters_cognitive_budget':
        return this.getCognitiveBudget(
          args.components as string[],
          (args.tier as BudgetTier) ?? 'page',
        );
      case 'rafters_onboard':
        return this.onboard(args);
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
   * Returns: system rules, consumer quickstart, color tokens, spacing, type scale, components
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
        quickstart: CONSUMER_QUICKSTART,
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
   * Extract compact color vocabulary.
   * Always includes the known semantic token list so consumers get guidance
   * even when dynamic token loading fails or returns empty.
   */
  private async getColorVocabulary(): Promise<{
    semantic: string[];
    palettes: Array<{ name: string; positions: string[] }>;
    usage: string;
  }> {
    // Derived from the design-tokens source of truth.
    // All keys from DEFAULT_SEMANTIC_COLOR_MAPPINGS are available as CSS custom properties.
    const knownSemantic = Object.keys(DEFAULT_SEMANTIC_COLOR_MAPPINGS);

    try {
      const tokens = await this.loadNamespace('color');
      const dynamicSemantic: string[] = [];
      const palettes = new Map<string, Set<string>>();

      for (const token of tokens) {
        if (typeof token.value === 'object' && 'family' in (token.value as object)) {
          dynamicSemantic.push(token.name);
        } else if (typeof token.value === 'object' && 'scale' in (token.value as object)) {
          const colorValue = token.value as ColorValue;
          palettes.set(
            colorValue.name,
            new Set(['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']),
          );
        }
      }

      // Merge dynamic with known, deduplicating
      const allSemantic = [...new Set([...knownSemantic, ...dynamicSemantic])];

      return {
        semantic: allSemantic,
        palettes: [...palettes.entries()].map(([name, positions]) => ({
          name,
          positions: [...positions],
        })),
        usage:
          'Use as Tailwind classes: bg-primary, text-info-foreground, border-l-success. Palette families are internal -- never reference them in consumer code.',
      };
    } catch {
      return {
        semantic: knownSemantic,
        palettes: [],
        usage:
          'Use as Tailwind classes: bg-primary, text-info-foreground, border-l-success. Palette families are internal -- never reference them in consumer code.',
      };
    }
  }

  /**
   * Extract compact spacing vocabulary.
   * Includes static scale names so consumers always get guidance.
   */
  private async getSpacingVocabulary(): Promise<{
    scale: Record<string, string>;
    usage: string;
  }> {
    try {
      const tokens = await this.loadNamespace('spacing');
      const scale: Record<string, string> = {};

      for (const token of tokens) {
        if (typeof token.value === 'string') {
          scale[token.name] = token.value;
        }
      }

      if (Object.keys(scale).length > 0) {
        return {
          scale,
          usage: 'Container and Grid handle spacing. Do not use gap-*, p-*, m-* directly.',
        };
      }
    } catch {
      // Fall through to static fallback
    }

    // Derive fallback from design-tokens source of truth
    const scale: Record<string, string> = {};
    for (const [key, multiplier] of Object.entries(DEFAULT_SPACING_MULTIPLIERS)) {
      scale[`spacing-${key}`] = `${multiplier * 0.25}rem`;
    }
    return {
      scale,
      usage: 'Container and Grid handle spacing. Do not use gap-*, p-*, m-* directly.',
    };
  }

  /**
   * Extract compact typography vocabulary.
   * Includes static fallbacks so consumers always get guidance.
   */
  private async getTypographyVocabulary(): Promise<{
    sizes: Record<string, string>;
    weights: string[];
    usage: string;
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

      if (Object.keys(sizes).length > 0) {
        return {
          sizes,
          weights: [...weights],
          usage:
            'Typography components (H1-H4, P, Label) handle sizing. Do not set font sizes directly.',
        };
      }
    } catch {
      // Fall through to static fallback
    }

    // Derive fallback from design-tokens source of truth
    const sizes: Record<string, string> = {};
    for (const name of Object.keys(DEFAULT_TYPOGRAPHY_SCALE)) {
      sizes[`font-size-${name}`] = name;
    }
    return {
      sizes,
      weights: Object.keys(DEFAULT_FONT_WEIGHTS),
      usage:
        'Typography components (H1-H4, P, Label) handle sizing. Do not set font sizes directly.',
    };
  }

  /**
   * Load and cache the project's Rafters config from .rafters/config.rafters.json.
   * Returns null when no config exists or when it cannot be parsed.
   */
  private async loadConfig(): Promise<RaftersConfig | null> {
    if (this.cachedConfig !== undefined) return this.cachedConfig;
    if (!this.projectRoot) {
      this.cachedConfig = null;
      return null;
    }
    const paths = getRaftersPaths(this.projectRoot);
    if (!existsSync(paths.config)) {
      this.cachedConfig = null;
      return null;
    }
    const content = await readFile(paths.config, 'utf-8');
    try {
      this.cachedConfig = JSON.parse(content) as RaftersConfig;
    } catch {
      throw new Error(`Malformed JSON in ${paths.config}. Check the file for syntax errors.`);
    }
    return this.cachedConfig;
  }

  /**
   * Extract compact component vocabulary
   */
  private async getComponentVocabulary(): Promise<{
    installed: string[];
    available: string[];
  }> {
    // Read installed components from config
    const config = await this.loadConfig();
    const installed = config?.installed?.components ?? [];

    // Fetch available components from registry
    let available: string[];
    try {
      const index = await registryClient.fetchIndex();
      const installedSet = new Set(installed);
      available = index.components.filter((name) => !installedSet.has(name));
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      available = [`(registry unreachable: ${msg})`];
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
   * Get path to UI components directory.
   * Reads componentsPath from .rafters/config.rafters.json when available,
   * falls back to the monorepo layout for local development.
   */
  private async getComponentsPath(): Promise<string | null> {
    if (!this.projectRoot) return null;
    const config = await this.loadConfig();
    if (config?.componentsPath) {
      return join(this.projectRoot, config.componentsPath);
    }
    // Fallback: monorepo development layout
    return join(this.projectRoot, 'packages/ui/src/components/ui');
  }

  /**
   * Find the actual component file on disk for a given name.
   * Checks the config's componentTarget extension first, then falls back
   * to all known extensions so Astro projects with React islands also work.
   */
  private async resolveComponentFile(componentsPath: string, name: string): Promise<string | null> {
    const config = await this.loadConfig();
    const preferredExt = targetToExtension(resolveComponentTarget(config));
    const preferred = join(componentsPath, `${name}${preferredExt}`);
    if (existsSync(preferred)) return preferred;

    for (const ext of COMPONENT_EXTENSIONS) {
      if (ext === preferredExt) continue;
      const candidate = join(componentsPath, `${name}${ext}`);
      if (existsSync(candidate)) return candidate;
    }
    return null;
  }

  /**
   * Load component metadata from source file.
   * Resolves the actual file extension from the config's componentTarget
   * and merges variant/size data from .classes.ts companions when present.
   */
  private async loadComponentMetadata(name: string): Promise<ComponentMetadata | null> {
    const componentsPath = await this.getComponentsPath();
    if (!componentsPath) return null;
    const filePath = await this.resolveComponentFile(componentsPath, name);
    if (!filePath) return null;

    try {
      const source = await readFile(filePath, 'utf-8');
      const intelligence = parseJSDocIntelligence(source);
      const description = parseDescription(source);

      let jsDocDeps: JSDocDependencies = { runtime: [], dev: [], internal: [] };
      try {
        jsDocDeps = extractJSDocDependencies(source);
      } catch {
        // JSDoc parsing failure should not prevent component metadata from being returned
      }

      let variants = extractVariants(source);
      let sizes = extractSizes(source);

      // Merge variant/size data from .classes.ts companion when present
      try {
        const classesSource = await readFile(join(componentsPath, `${name}.classes.ts`), 'utf-8');
        if (!variants || variants.length === 0) {
          variants = extractVariants(classesSource);
        }
        if (!sizes || sizes.length === 0) {
          sizes = extractSizes(classesSource);
        }
      } catch {
        // No .classes.ts companion or read failure -- non-fatal
      }

      const metadata: ComponentMetadata = {
        name,
        displayName: toDisplayName(name),
        category: this.inferCategory(name),
        variants,
        sizes,
        dependencies: extractDependencies(source),
        primitives: extractPrimitiveDependencies(source),
        // projectRoot is guaranteed non-null here: handleToolCall guards it
        filePath: relative(this.projectRoot as string, filePath),
      };

      if (hasAnyDeps(jsDocDeps)) {
        metadata.jsDocDependencies = jsDocDeps;
      }

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
        const componentsPath = await this.getComponentsPath();
        let available: string[] = [];
        if (componentsPath) {
          try {
            const files = await readdir(componentsPath);
            available = files
              .filter(
                (f) =>
                  COMPONENT_EXTENSIONS.some((ext) => f.endsWith(ext)) && !f.includes('.classes.'),
              )
              .map((f) => {
                const ext = COMPONENT_EXTENSIONS.find((e) => f.endsWith(e));
                return ext ? basename(f, ext) : basename(f);
              })
              .filter((n) => n.includes(name) || name.includes(n))
              .slice(0, 5);
          } catch {
            // Components directory does not exist
          }
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

      if (metadata.jsDocDependencies && hasAnyDeps(metadata.jsDocDependencies)) {
        formatted.jsDocDependencies = metadata.jsDocDependencies;
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

  // ==================== Token Write Operations ====================

  private static readonly VALID_SCALE_POSITIONS = /^(50|100|200|300|400|500|600|700|800|900|950)$/;

  /**
   * Parse "family-position" string (e.g., "neutral-950") into { family, position }.
   * Returns null if the string is not a valid color reference.
   */
  static parseColorRef(ref: string): { family: string; position: string } | null {
    const lastDash = ref.lastIndexOf('-');
    if (lastDash <= 0) return null;
    const position = ref.slice(lastDash + 1);
    const family = ref.slice(0, lastDash);
    if (!RaftersToolHandler.VALID_SCALE_POSITIONS.test(position)) return null;
    return { family, position };
  }

  /**
   * Handle set, create, and reset actions for rafters_token.
   * Loads the full registry, mutates, cascades, persists, and regenerates outputs.
   */
  private async writeToken(action: string, args: Record<string, unknown>): Promise<CallToolResult> {
    const name = args.name as string;
    const reason = args.reason as string | undefined;
    const value = args.value as string | undefined;
    const dark = args.dark as string | undefined;

    // Why-gate: every mutation needs a reason
    if (!reason) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'Reason is required for every token mutation.',
              hint: 'Every change needs a WHY that captures design intent, not just origin.',
              bad: 'imported from globals.css',
              good: 'Brand blue from --brand-primary, primary identity color per designer',
            }),
          },
        ],
        isError: true,
      };
    }

    if (!this.adapter || !this.projectRoot) {
      return { content: [{ type: 'text', text: NO_PROJECT_ERROR }], isError: true };
    }

    try {
      // Load full registry
      const allTokens = await this.adapter.load();
      const registry = new TokenRegistry(allTokens);
      registry.setAdapter(this.adapter);

      switch (action) {
        case 'set': {
          if (!value) {
            return {
              content: [{ type: 'text', text: '{"error": "value is required for set action"}' }],
              isError: true,
            };
          }
          const existing = registry.get(name);
          if (!existing) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: `Token "${name}" not found. Use action: "create" for new tokens.`,
                  }),
                },
              ],
              isError: true,
            };
          }

          // Validate dark parameter before any mutation
          if (dark) {
            if (existing.namespace !== 'semantic') {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      error: `The "dark" parameter only applies to semantic color tokens. Token "${name}" is in the "${existing.namespace}" namespace.`,
                    }),
                  },
                ],
                isError: true,
              };
            }
            if (!RaftersToolHandler.parseColorRef(dark)) {
              return {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify({
                      error: `Invalid dark reference "${dark}". Use format "family-position" (e.g., "neutral-950"). Valid positions: 50, 100-900 by 100, 950.`,
                    }),
                  },
                ],
                isError: true,
              };
            }
          }

          // Set with userOverride tracking — use setToken() to persist full token including userOverride
          const previousValue = existing.value;
          existing.userOverride = {
            previousValue:
              typeof previousValue === 'string' ? previousValue : JSON.stringify(previousValue),
            reason,
          };

          // Semantic tokens need ColorReference objects, not plain strings
          // (the CSS exporter skips string values for semantic tokens)
          const parsed =
            existing.namespace === 'semantic' && typeof value === 'string'
              ? RaftersToolHandler.parseColorRef(value)
              : null;

          if (existing.namespace === 'semantic' && typeof value === 'string' && !parsed) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: `Semantic token "${name}" requires a color reference in "family-position" format (e.g., "neutral-50"), not "${value}". Use rafters_vocabulary to find available color families.`,
                  }),
                },
              ],
              isError: true,
            };
          }

          if (parsed) {
            existing.value = parsed;
            const lightRefStr = `${parsed.family}-${parsed.position}`;
            const darkRef = dark ?? existing.dependsOn?.[1] ?? lightRefStr;
            existing.dependsOn = [lightRefStr, darkRef];
          } else {
            existing.value = value;
          }

          await registry.setToken(existing);

          const affected = this.getAffectedTokens(registry, name);
          const outputFiles = await this.regenerateOutputs(registry);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  ok: true,
                  action: 'set',
                  name,
                  reason,
                  persisted: {
                    value: existing.value,
                    dependsOn: existing.dependsOn,
                    namespace: existing.namespace,
                  },
                  cascaded: affected,
                  outputFiles,
                }),
              },
            ],
          };
        }

        case 'create': {
          const namespace = args.namespace as string | undefined;
          const category = args.category as string | undefined;

          if (!value) {
            return {
              content: [{ type: 'text', text: '{"error": "value is required for create action"}' }],
              isError: true,
            };
          }
          if (!namespace) {
            return {
              content: [
                { type: 'text', text: '{"error": "namespace is required for create action"}' },
              ],
              isError: true,
            };
          }
          if (!category) {
            return {
              content: [
                { type: 'text', text: '{"error": "category is required for create action"}' },
              ],
              isError: true,
            };
          }
          if (registry.has(name)) {
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    error: `Token "${name}" already exists. Use action: "set" to update.`,
                  }),
                },
              ],
              isError: true,
            };
          }

          const newToken: Token = {
            name,
            namespace,
            category,
            value,
            containerQueryAware: true,
            userOverride: {
              previousValue: '',
              reason,
            },
          };

          registry.add(newToken);
          await this.adapter.save(registry.list());
          const outputFiles = await this.regenerateOutputs(registry);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  ok: true,
                  action: 'create',
                  name,
                  namespace,
                  reason,
                  persisted: {
                    value: newToken.value,
                    dependsOn: newToken.dependsOn,
                    namespace: newToken.namespace,
                  },
                  outputFiles,
                }),
              },
            ],
          };
        }

        case 'reset': {
          const existing = registry.get(name);
          if (!existing) {
            return {
              content: [
                { type: 'text', text: JSON.stringify({ error: `Token "${name}" not found.` }) },
              ],
              isError: true,
            };
          }

          await registry.set(name, COMPUTED);

          const resolved = registry.get(name);
          const affected = this.getAffectedTokens(registry, name);
          const outputFiles = await this.regenerateOutputs(registry);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  ok: true,
                  action: 'reset',
                  name,
                  reason,
                  persisted: {
                    value: resolved?.value,
                    dependsOn: resolved?.dependsOn,
                    namespace: resolved?.namespace,
                  },
                  cascaded: affected,
                  outputFiles,
                }),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: `Unknown action: ${action}. Use get, set, create, or reset.`,
                }),
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      return this.handleError('writeToken', error);
    }
  }

  /**
   * Get list of tokens that would be affected by changing the given token
   */
  private getAffectedTokens(registry: TokenRegistry, tokenName: string): string[] {
    const affected: string[] = [];
    for (const token of registry.list()) {
      if (token.dependsOn?.includes(tokenName)) {
        affected.push(token.name);
      }
    }
    return affected;
  }

  /**
   * Regenerate output files (CSS, TS, DTCG) from registry state.
   * Returns list of files written so callers can report what changed.
   */
  private async regenerateOutputs(registry: TokenRegistry): Promise<string[]> {
    if (!this.projectRoot) return [];

    const paths = getRaftersPaths(this.projectRoot);
    const config = await this.loadConfig();
    const exports = config?.exports ?? {
      tailwind: true,
      typescript: true,
      dtcg: false,
      compiled: false,
    };
    const shadcn = config?.shadcn ?? false;
    const written: string[] = [];

    await mkdir(paths.output, { recursive: true });

    if (exports.tailwind) {
      const darkMode = config?.darkMode ?? 'class';
      const css = registryToTailwind(registry, { includeImport: !shadcn, darkMode });
      const cssPath = join(paths.output, 'rafters.css');
      await writeFile(cssPath, css);
      written.push(relative(this.projectRoot, cssPath));
    }

    if (exports.typescript) {
      const ts = registryToTypeScript(registry, { includeJSDoc: true });
      const tsPath = join(paths.output, 'rafters.ts');
      await writeFile(tsPath, ts);
      written.push(relative(this.projectRoot, tsPath));
    }

    if (exports.dtcg) {
      const json = toDTCG(registry.list());
      const jsonPath = join(paths.output, 'rafters.json');
      await writeFile(jsonPath, JSON.stringify(json, null, 2));
      written.push(relative(this.projectRoot, jsonPath));
    }

    return written;
  }

  // ==================== Tool 6: Onboard ====================

  /**
   * CSS file locations by framework (mirrors init.ts CSS_LOCATIONS)
   */
  private static readonly CSS_LOCATIONS: Record<string, string[]> = {
    astro: ['src/styles/global.css', 'src/styles/globals.css', 'src/global.css'],
    next: ['src/app/globals.css', 'app/globals.css', 'styles/globals.css'],
    vite: ['src/index.css', 'src/main.css', 'src/styles.css', 'src/app.css'],
    remix: ['app/styles/global.css', 'app/globals.css', 'app/root.css'],
    'react-router': ['app/app.css', 'app/root.css', 'app/styles.css', 'app/globals.css'],
    unknown: [
      'src/styles/global.css',
      'src/styles/globals.css',
      'src/index.css',
      'src/main.css',
      'src/app.css',
      'styles/globals.css',
      'app/globals.css',
    ],
  };

  /**
   * The 11 semantic color families every design system needs.
   * Defaults are not wrong. Unexamined defaults are wrong.
   */
  private static readonly SEMANTIC_FAMILIES = [
    'primary',
    'secondary',
    'tertiary',
    'accent',
    'neutral',
    'success',
    'warning',
    'destructive',
    'info',
    'highlight',
    'muted',
  ] as const;

  private static readonly SEMANTIC_FAMILY_SET = new Set<string>(
    RaftersToolHandler.SEMANTIC_FAMILIES,
  );

  /** Scale positions indexed 0-10, matching ColorValue.scale array indices */
  private static readonly SCALE_POSITIONS = [
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
  ] as const;

  private static positionToIndex(position: string): number {
    const idx = RaftersToolHandler.SCALE_POSITIONS.indexOf(
      position as (typeof RaftersToolHandler.SCALE_POSITIONS)[number],
    );
    return idx >= 0 ? idx : 5; // default to 500
  }

  /**
   * Find an accessible foreground position against a given background position.
   * Tries AAA first (7:1), falls back to AA (4.5:1), keeps default if both pass.
   */
  private static findAccessibleFgPosition(
    bgPosition: string,
    defaultFgPosition: string,
    aaaPairs: number[][],
    aaPairs: number[][],
  ): string {
    const bgIdx = RaftersToolHandler.positionToIndex(bgPosition);
    const fgIdx = RaftersToolHandler.positionToIndex(defaultFgPosition);

    const pairValid = (pairs: number[][]) =>
      pairs.some(([a, b]) => (a === bgIdx && b === fgIdx) || (a === fgIdx && b === bgIdx));

    // Default positions already meet AAA or AA -- keep them
    if (pairValid(aaaPairs) || pairValid(aaPairs)) return defaultFgPosition;

    // Find best alternative: AAA with same bg first, then AA
    const bestPair = aaaPairs.find(([a]) => a === bgIdx) ?? aaPairs.find(([a]) => a === bgIdx);

    if (bestPair && bestPair[1] !== undefined) {
      return RaftersToolHandler.SCALE_POSITIONS[bestPair[1]] ?? defaultFgPosition;
    }

    return defaultFgPosition;
  }

  /**
   * When a semantic family is mapped to a color, cascade to all surface tokens
   * that reference that family. Uses precomputed accessibility data from the
   * ColorValue to verify WCAG AAA (fall back to AA) compliance for fg/bg pairs.
   */
  private cascadeSemanticFamily(
    registry: TokenRegistry,
    familyName: string,
    colorFamilyName: string,
    results: Array<{
      source: string;
      target: string;
      action: string;
      ok: boolean;
      enriched?: boolean;
      error?: string;
      persisted?: { value: unknown; dependsOn?: string[] };
    }>,
  ): Token[] {
    const tokensToUpdate: Token[] = [];

    // Get the color family token to access its accessibility data
    const colorFamilyToken = registry.get(colorFamilyName);
    const colorValue =
      colorFamilyToken?.value &&
      typeof colorFamilyToken.value === 'object' &&
      'scale' in colorFamilyToken.value
        ? (colorFamilyToken.value as ColorValue)
        : null;

    const aaaPairs = colorValue?.accessibility?.wcagAAA?.normal ?? [];
    const aaPairs = colorValue?.accessibility?.wcagAA?.normal ?? [];

    for (const [name, mapping] of Object.entries(DEFAULT_SEMANTIC_COLOR_MAPPINGS)) {
      // For non-neutral: match exact name or "family-*" prefix
      // For neutral: match all tokens whose defaults reference the neutral family
      const belongsToFamily =
        familyName === 'neutral'
          ? mapping.light.family === 'neutral' && mapping.dark.family === 'neutral'
          : name === familyName || name.startsWith(`${familyName}-`);

      if (!belongsToFamily) continue;

      const existing = registry.get(name);
      if (!existing) continue;

      // Preserve human overrides -- designer decisions win
      if (
        existing.userOverride?.reason &&
        !existing.userOverride.reason.startsWith('Auto-cascaded')
      ) {
        continue;
      }

      let lightPos = mapping.light.position;
      let darkPos = mapping.dark.position;

      // Foreground tokens stay on neutral for contrast -- don't remap them
      // to the color family. Only adjust their positions for WCAG compliance.
      const isForeground = name.endsWith('-foreground');
      const tokenFamily = isForeground ? 'neutral' : colorFamilyName;

      if (isForeground && colorValue) {
        const bgName = name.replace(/-foreground$/, '');
        const bgMapping = DEFAULT_SEMANTIC_COLOR_MAPPINGS[bgName];
        if (bgMapping) {
          lightPos = RaftersToolHandler.findAccessibleFgPosition(
            bgMapping.light.position,
            lightPos,
            aaaPairs,
            aaPairs,
          );
          darkPos = RaftersToolHandler.findAccessibleFgPosition(
            bgMapping.dark.position,
            darkPos,
            aaaPairs,
            aaPairs,
          );
        }
      }

      const lightRef = { family: tokenFamily, position: lightPos };
      const lightTokenName = `${tokenFamily}-${lightPos}`;
      const darkTokenName = `${tokenFamily}-${darkPos}`;

      tokensToUpdate.push({
        ...existing,
        value: lightRef,
        dependsOn: [lightTokenName, darkTokenName],
        userOverride: {
          previousValue:
            typeof existing.value === 'string' ? existing.value : JSON.stringify(existing.value),
          reason: `Auto-cascaded from ${familyName} -> ${colorFamilyName}`,
        },
      });

      results.push({
        source: familyName,
        target: name,
        action: 'cascade',
        ok: true,
        persisted: { value: lightRef, dependsOn: [lightTokenName, darkTokenName] },
      });
    }

    return tokensToUpdate;
  }

  /**
   * Handle rafters_onboard tool calls
   */
  private async onboard(args: Record<string, unknown>): Promise<CallToolResult> {
    const action = args.action as string;

    switch (action) {
      case 'analyze':
        return this.analyzeProject();
      case 'status':
        return this.getOnboardStatus();
      case 'map': {
        const confirmed = args.confirmed as boolean | undefined;
        if (!confirmed) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'Human confirmation required.',
                  action:
                    'STOP. Do not call this tool again until the designer has reviewed and approved every mapping.',
                  instructions: [
                    'Show each proposed mapping to the designer: source -> target, value, and your proposed reason.',
                    'Ask the designer: "Is this the right semantic role? Why did you choose this color for this purpose?"',
                    'The designer must provide or approve the reason. Do not write reasons yourself.',
                    'Once the designer has confirmed all mappings, call rafters_onboard map again with confirmed: true.',
                  ],
                }),
              },
            ],
            isError: true,
          };
        }
        return this.mapTokens(args.mappings as Array<Record<string, string>> | undefined);
      }
      default:
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Unknown action: ${action}. Use analyze or map.` }),
            },
          ],
          isError: true,
        };
    }
  }

  /**
   * Scan the project for existing design decisions.
   * Returns raw findings -- the agent interprets, not the tool.
   */
  private async analyzeProject(): Promise<CallToolResult> {
    if (!this.projectRoot) {
      return { content: [{ type: 'text', text: NO_PROJECT_ERROR }], isError: true };
    }

    try {
      const config = await this.loadConfig();
      const framework = config?.framework ?? 'unknown';

      // Find all CSS files
      const cssFindings: Array<{
        path: string;
        customProperties: Array<{ name: string; value: string; context: string }>;
        themeBlocks: string[];
        imports: string[];
      }> = [];

      // Check framework-specific locations + config cssPath
      const locations = new Set<string>();
      const frameworkLocations =
        RaftersToolHandler.CSS_LOCATIONS[framework] ??
        RaftersToolHandler.CSS_LOCATIONS.unknown ??
        [];
      for (const loc of frameworkLocations) locations.add(loc);
      if (config?.cssPath) locations.add(config.cssPath);

      for (const cssPath of locations) {
        const fullPath = join(this.projectRoot, cssPath);
        if (!existsSync(fullPath)) continue;

        try {
          const content = await readFile(fullPath, 'utf-8');
          const finding = this.parseCssFindings(cssPath, content);
          if (
            finding.customProperties.length > 0 ||
            finding.themeBlocks.length > 0 ||
            finding.imports.length > 0
          ) {
            cssFindings.push(finding);
          }
        } catch {
          // Unreadable CSS file, skip
        }
      }

      // Check for shadcn
      let shadcn: { detected: boolean; cssPath?: string } = { detected: false };
      try {
        const componentsJson = await readFile(join(this.projectRoot, 'components.json'), 'utf-8');
        const parsed = JSON.parse(componentsJson) as { tailwind?: { css?: string } };
        const cssPath = parsed.tailwind?.css;
        shadcn = cssPath ? { detected: true, cssPath } : { detected: true };
      } catch {
        // No shadcn
      }

      // Check for design-related packages
      let designDeps: string[] = [];
      try {
        const pkgContent = await readFile(join(this.projectRoot, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgContent) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        const designPatterns = [
          '@radix-ui',
          'class-variance-authority',
          'tailwind-merge',
          'clsx',
          '@headlessui',
          'lucide-react',
          '@heroicons',
        ];
        designDeps = Object.keys(allDeps).filter((dep) =>
          designPatterns.some((p) => dep.startsWith(p)),
        );
      } catch {
        // No package.json
      }

      // Count existing tokens and check family status
      let existingTokenCount = 0;
      const familyStatus: Record<
        string,
        { status: 'default' | 'designer' | 'unmapped'; reason?: string }
      > = {};

      if (this.adapter) {
        const tokens = await this.adapter.load();
        existingTokenCount = tokens.length;

        for (const family of RaftersToolHandler.SEMANTIC_FAMILIES) {
          const token = tokens.find((t) => t.name === family);
          if (!token) {
            familyStatus[family] = { status: 'unmapped' };
          } else if (token.userOverride?.reason) {
            familyStatus[family] = { status: 'designer', reason: token.userOverride.reason };
          } else {
            familyStatus[family] = { status: 'default' };
          }
        }
      }

      // Detect color scale patterns (e.g., --color-blaze-50 through --color-blaze-950)
      const detectedFamilies: Array<{
        family: string;
        positions: string[];
        baseValue: string;
        source: string;
      }> = [];

      const allProps = cssFindings.flatMap((f) => f.customProperties);
      const familyMap = new Map<string, Array<{ position: string; value: string }>>();

      for (const prop of allProps) {
        // Match patterns like --color-blaze-500, --brand-primary-200
        const scaleMatch = prop.name.match(
          /^--(color-)?(.+?)-(50|100|200|300|400|500|600|700|800|900|950)$/,
        );
        if (scaleMatch?.[2] && scaleMatch[3]) {
          const family = scaleMatch[2];
          if (!familyMap.has(family)) familyMap.set(family, []);
          familyMap.get(family)?.push({ position: scaleMatch[3], value: prop.value });
        }
      }

      for (const [family, positions] of familyMap) {
        if (positions.length >= 3) {
          const base =
            positions.find((p) => p.position === '500') ??
            positions.find((p) => p.position === '600') ??
            positions[0];
          if (base) {
            detectedFamilies.push({
              family,
              positions: positions.map((p) => p.position),
              baseValue: base.value,
              source: `--color-${family}-*`,
            });
          }
        }
      }

      const designerCount = Object.values(familyStatus).filter(
        (s) => s.status === 'designer',
      ).length;
      const totalFamilies = RaftersToolHandler.SEMANTIC_FAMILIES.length;

      // Detect dark mode properties to guide semantic remapping
      const hasDarkMode = cssFindings.some((f) =>
        f.customProperties.some(
          (p) => p.context === '.dark' || p.context === 'prefers-color-scheme: dark',
        ),
      );

      let guidance: string;
      if (detectedFamilies.length > 0) {
        guidance = `Found ${detectedFamilies.length} color scale pattern(s): ${detectedFamilies.map((f) => f.family).join(', ')}. Map each family using its base color (position 500/600), not individual scale positions. buildColorValue() will regenerate the full 11-step scale.`;
      } else {
        guidance =
          'Review the custom properties above. Map each to a rafters token using rafters_onboard with action: "map". For ambiguous decisions, ask the designer.';
      }

      if (hasDarkMode) {
        guidance +=
          ' DARK MODE DETECTED: After mapping color families, remap semantic surface tokens (background, foreground, card, popover, etc.) to point at the correct family+position for dark mode. Use the "light" and "dark" fields in the mapping instead of "value". Default semantic tokens reference "neutral" family -- if the project uses a different dark palette, these must be remapped.';
      }

      const result = {
        framework,
        cssFiles: cssFindings,
        colorFamilies: detectedFamilies.length > 0 ? detectedFamilies : undefined,
        familyStatus,
        familyCoverage: `${designerCount}/${totalFamilies} semantic families have designer decisions`,
        shadcn,
        designDependencies: designDeps,
        existingTokenCount,
        hasDarkMode,
        guidance,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return this.handleError('analyzeProject', error);
    }
  }

  /**
   * Check onboarding completeness -- which families have designer decisions
   */
  private async getOnboardStatus(): Promise<CallToolResult> {
    if (!this.adapter || !this.projectRoot) {
      return { content: [{ type: 'text', text: NO_PROJECT_ERROR }], isError: true };
    }

    try {
      const tokens = await this.adapter.load();
      const mapped: string[] = [];
      const defaultsRemaining: string[] = [];
      const unmapped: string[] = [];

      for (const family of RaftersToolHandler.SEMANTIC_FAMILIES) {
        const token = tokens.find((t) => t.name === family);
        if (!token) {
          unmapped.push(family);
        } else if (token.userOverride?.reason) {
          mapped.push(family);
        } else {
          defaultsRemaining.push(family);
        }
      }

      // Find custom color families (non-semantic, in color namespace, with designer reason)
      const semanticSet = new Set<string>(RaftersToolHandler.SEMANTIC_FAMILIES);
      const customFamilies = tokens
        .filter(
          (t) =>
            t.namespace === 'color' &&
            !semanticSet.has(t.name) &&
            t.userOverride?.reason &&
            !t.name.includes('-'),
        )
        .map((t) => t.name);

      const complete = defaultsRemaining.length === 0 && unmapped.length === 0;
      const coverage = `${mapped.length}/${RaftersToolHandler.SEMANTIC_FAMILIES.length}`;

      let guidance: string;
      if (complete) {
        guidance = 'All semantic families have designer decisions. Onboarding is complete.';
      } else if (defaultsRemaining.length > 0) {
        guidance = `${defaultsRemaining.length} families still use generated defaults: ${defaultsRemaining.join(', ')}. Ask the designer: do these defaults work, or should we choose specific colors? If the defaults are intentional, confirm them with a reason.`;
      } else {
        guidance = `${unmapped.length} families are unmapped: ${unmapped.join(', ')}. These need designer decisions.`;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                complete,
                coverage,
                families: { mapped, defaultsRemaining, unmapped, customFamilies },
                guidance,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return this.handleError('getOnboardStatus', error);
    }
  }

  /**
   * Parse CSS content into structured findings
   */
  private parseCssFindings(
    path: string,
    content: string,
  ): {
    path: string;
    customProperties: Array<{ name: string; value: string; context: string }>;
    themeBlocks: string[];
    imports: string[];
  } {
    const customProperties: Array<{ name: string; value: string; context: string }> = [];
    const themeBlocks: string[] = [];
    const imports: string[] = [];

    // Extract imports
    const importMatches = content.matchAll(/@import\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      if (match[1]) imports.push(match[1]);
    }

    // Extract @theme blocks and their properties
    const themeMatches = content.matchAll(/@theme\s*\{([^}]+)\}/g);
    for (const match of themeMatches) {
      if (match[0]) themeBlocks.push(match[0].trim());
      if (match[1]) this.extractCustomProperties(match[1], '@theme', customProperties);
    }

    // Extract custom properties from :root
    const rootMatch = content.match(/:root\s*\{([^}]+)\}/);
    if (rootMatch?.[1]) {
      this.extractCustomProperties(rootMatch[1], ':root', customProperties);
    }

    // Extract from .dark
    const darkMatch = content.match(/\.dark\s*\{([^}]+)\}/);
    if (darkMatch?.[1]) {
      this.extractCustomProperties(darkMatch[1], '.dark', customProperties);
    }

    // Extract from prefers-color-scheme
    const prefersMatch = content.match(
      /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[^{]*\{([^}]+)\}/,
    );
    if (prefersMatch?.[1]) {
      this.extractCustomProperties(prefersMatch[1], 'prefers-color-scheme: dark', customProperties);
    }

    return { path, customProperties, themeBlocks, imports };
  }

  /**
   * Extract CSS custom properties from a block
   */
  private extractCustomProperties(
    block: string,
    context: string,
    out: Array<{ name: string; value: string; context: string }>,
  ): void {
    const propMatches = block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g);
    for (const match of propMatches) {
      if (match[1] && match[2]) {
        out.push({ name: match[1], value: match[2].trim(), context });
      }
    }
  }

  /**
   * Detect if a string value is a CSS color (not a size, calc, or var reference)
   */
  private static isColorValue(value: string): boolean {
    const v = value.trim().toLowerCase();
    if (/^\d/.test(v) || v.startsWith('var(') || v.startsWith('calc(')) return false;
    if (/\d+(rem|px|em|%|vw|vh|dvh|svh|ch|ex)$/.test(v)) return false;
    return (
      v.startsWith('#') ||
      v.startsWith('rgb') ||
      v.startsWith('hsl') ||
      v.startsWith('oklch') ||
      v.startsWith('oklab') ||
      v.startsWith('lch') ||
      v.startsWith('lab') ||
      v.startsWith('color(') ||
      v.startsWith('hwb')
    );
  }

  /**
   * Parse any CSS color to OKLCH. hexToOKLCH uses colorjs.io internally
   * which accepts all CSS color formats, not just hex.
   */
  private static parseToOKLCH(value: string): OKLCH | null {
    try {
      return hexToOKLCH(value.trim());
    } catch {
      return null;
    }
  }

  /**
   * Fire api.rafters.studio enrichment for a color (non-blocking)
   */
  private static fireEnrichment(oklch: OKLCH): Promise<unknown> {
    const l = oklch.l.toFixed(3);
    const c = oklch.c.toFixed(3);
    const h = Math.round(oklch.h);
    return fetch(`https://api.rafters.studio/color/${l}-${c}-${h}?sync=true`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }

  /**
   * Build enriched ColorValue: local math + API intelligence
   */
  private static async buildEnrichedColor(oklch: OKLCH, tokenName: string): Promise<ColorValue> {
    // Fire API before local math (same pattern as studio vite-plugin)
    const enrichmentPromise = RaftersToolHandler.fireEnrichment(oklch);

    // Local math (~1ms)
    const colorValue = buildColorValue(oklch, { token: tokenName });

    // Merge API intelligence when it arrives
    const enrichment = await enrichmentPromise;
    if (enrichment && typeof enrichment === 'object' && 'color' in enrichment) {
      const apiColor = (enrichment as { color: { intelligence?: unknown } }).color;
      if (apiColor?.intelligence) {
        (colorValue as Record<string, unknown>).intelligence = apiColor.intelligence;
      }
    }

    return colorValue;
  }

  /**
   * Execute a mapping plan -- enriches colors, writes tokens
   */
  private async mapTokens(
    mappings: Array<Record<string, string>> | undefined,
  ): Promise<CallToolResult> {
    if (!mappings || mappings.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'mappings array is required for map action',
              hint: 'Run analyze first, then provide mappings with source, target, value, and reason',
            }),
          },
        ],
        isError: true,
      };
    }

    if (!this.adapter || !this.projectRoot) {
      return { content: [{ type: 'text', text: NO_PROJECT_ERROR }], isError: true };
    }

    try {
      // Load registry once for all mappings
      const allTokens = await this.adapter.load();
      const registry = new TokenRegistry(allTokens);
      registry.setAdapter(this.adapter);

      const results: Array<{
        source: string;
        target: string;
        action: string;
        ok: boolean;
        enriched?: boolean;
        error?: string;
        persisted?: { value: unknown; dependsOn?: string[] };
      }> = [];

      const parseRef = RaftersToolHandler.parseColorRef;
      const allCascadeTokens: Token[] = [];

      for (const mapping of mappings) {
        const { source, target, value, reason, namespace, category } = mapping;
        const lightRef = mapping.light;
        const darkRef = mapping.dark;

        if (!source || !target || !reason) {
          results.push({
            source: source ?? '?',
            target: target ?? '?',
            action: 'skipped',
            ok: false,
            error: 'Missing required fields: source, target, reason',
          });
          continue;
        }

        // Semantic remapping: light/dark fields remap a semantic token's color references
        if (lightRef || darkRef) {
          const existing = registry.get(target);
          if (!existing) {
            results.push({
              source,
              target,
              action: 'skipped',
              ok: false,
              error: `Semantic token "${target}" not found. Only existing semantic tokens can be remapped.`,
            });
            continue;
          }

          const currentValue = existing.value;
          const currentLight =
            typeof currentValue === 'object' && currentValue !== null && 'family' in currentValue
              ? (currentValue as { family: string; position: string })
              : null;

          const newLight = lightRef ? parseRef(lightRef) : currentLight;
          if (lightRef && !newLight) {
            results.push({
              source,
              target,
              action: 'skipped',
              ok: false,
              error: `Invalid light reference "${lightRef}". Use format "family-position" (e.g., "neutral-50"). Valid positions: 50, 100-900 by 100, 950.`,
            });
            continue;
          }
          if (!lightRef && !currentLight) {
            results.push({
              source,
              target,
              action: 'skipped',
              ok: false,
              error: `Token "${target}" has no existing ColorReference value. You must supply an explicit "light" field to remap it.`,
            });
            continue;
          }

          const darkFallbackRef = existing.dependsOn?.[1];
          const newDark = darkRef
            ? parseRef(darkRef)
            : darkFallbackRef
              ? parseRef(darkFallbackRef)
              : newLight;

          if (darkRef && !newDark) {
            results.push({
              source,
              target,
              action: 'skipped',
              ok: false,
              error: `Invalid dark reference "${darkRef}". Use format "family-position" (e.g., "neutral-950"). Valid positions: 50, 100-900 by 100, 950.`,
            });
            continue;
          }
          if (!darkRef && darkFallbackRef && !newDark) {
            results.push({
              source,
              target,
              action: 'skipped',
              ok: false,
              error: `Could not infer dark reference from existing dependsOn value "${darkFallbackRef}". Supply an explicit "dark" field.`,
            });
            continue;
          }

          if (!newLight || !newDark) {
            results.push({
              source,
              target,
              action: 'skipped',
              ok: false,
              error: `Could not resolve light/dark references for "${target}". Supply explicit "light" and "dark" fields.`,
            });
            continue;
          }

          // Verify referenced color tokens exist
          const lightTokenName = `${newLight.family}-${newLight.position}`;
          const darkTokenName = `${newDark.family}-${newDark.position}`;
          const missingRefs: string[] = [];
          if (!registry.has(lightTokenName)) missingRefs.push(lightTokenName);
          if (!registry.has(darkTokenName)) missingRefs.push(darkTokenName);

          if (missingRefs.length > 0) {
            results.push({
              source,
              target,
              action: 'skipped',
              ok: false,
              error: `Referenced color tokens not found: ${missingRefs.join(', ')}. Map the color family first, then remap the semantic token.`,
            });
            continue;
          }

          // Update the semantic token
          const previousValue =
            typeof existing.value === 'string' ? existing.value : JSON.stringify(existing.value);
          existing.userOverride = {
            previousValue,
            reason: `Remapped from ${source}: ${reason}`,
          };

          // Set value AND dependsOn atomically via setToken so both persist
          const newColorRef = { family: newLight.family, position: newLight.position };
          await registry.setToken({
            ...existing,
            value: newColorRef,
            dependsOn: [lightTokenName, darkTokenName],
          });

          results.push({
            source,
            target,
            action: 'remap',
            ok: true,
            persisted: {
              value: newColorRef,
              dependsOn: [lightTokenName, darkTokenName],
            },
          });
          continue;
        }

        // Color family mapping: enrich a CSS color value
        if (!value) {
          results.push({
            source,
            target,
            action: 'skipped',
            ok: false,
            error:
              'Missing "value" for color family mapping. Provide a CSS color value, or use "light"/"dark" for semantic remapping.',
          });
          continue;
        }

        // Enrich color values into full ColorValue objects
        let colorValue: ColorValue | null = null;
        let enriched = false;

        if (RaftersToolHandler.isColorValue(value)) {
          const oklch = RaftersToolHandler.parseToOKLCH(value);
          if (oklch) {
            colorValue = await RaftersToolHandler.buildEnrichedColor(oklch, target);
            enriched = true;
          }
        }

        if (enriched && colorValue) {
          const isSemantic = RaftersToolHandler.SEMANTIC_FAMILY_SET.has(target);

          // For semantic targets (primary, accent, etc.), store the ColorValue under
          // its perceptual name to avoid overwriting the semantic token. For custom
          // families (blaze, empire, etc.), store directly under the target name.
          const familyName = isSemantic ? colorValue.name : target;

          // Store the ColorValue as a color family token
          if (registry.has(familyName)) {
            const existingFamily = registry.get(familyName);
            if (existingFamily && existingFamily.namespace === 'semantic') {
              // This is the semantic token -- don't overwrite it with the ColorValue.
              // Add the family under the perceptual name instead.
              registry.add({
                name: familyName,
                value: colorValue,
                category: 'color',
                namespace: 'color',
                semanticMeaning: `Color family for ${target}`,
                description: `Enriched color family "${familyName}" mapped to semantic role "${target}"`,
                containerQueryAware: true,
              });
            } else {
              await registry.set(familyName, colorValue);
            }
          } else {
            registry.add({
              name: familyName,
              value: colorValue,
              category: 'color',
              namespace: 'color',
              semanticMeaning: `Color family for ${target}`,
              description: `Enriched color family "${familyName}" mapped to semantic role "${target}"`,
              containerQueryAware: true,
              userOverride: isSemantic
                ? undefined
                : {
                    previousValue: '',
                    reason: `Onboarded from ${source}: ${reason}`,
                  },
            });
          }

          // Create individual palette position tokens from the enriched ColorValue scale
          const SCALE_POSITIONS = [
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
          ] as const;
          for (let i = 0; i < colorValue.scale.length && i < SCALE_POSITIONS.length; i++) {
            const pos = SCALE_POSITIONS[i];
            const oklchValue = colorValue.scale[i];
            if (!oklchValue) continue;
            const posName = `${familyName}-${pos}`;
            const cssValue = oklchToCSS(oklchValue);
            if (registry.has(posName)) {
              await registry.set(posName, cssValue);
            } else {
              registry.add({
                name: posName,
                value: cssValue,
                category: 'color',
                namespace: 'color',
                scalePosition: i,
                description: `${familyName} color at ${pos} position`,
                containerQueryAware: true,
              });
            }
          }

          if (isSemantic) {
            // Update the semantic token to point at the new family
            const existing = registry.get(target);
            if (existing) {
              const previousValue = existing.value;
              existing.userOverride = {
                previousValue:
                  typeof previousValue === 'string' ? previousValue : JSON.stringify(previousValue),
                reason: `Onboarded from ${source}: ${reason}`,
              };
              const defaultMapping = DEFAULT_SEMANTIC_COLOR_MAPPINGS[target];
              const lightPos = defaultMapping?.light.position ?? '900';
              await registry.setToken({
                ...existing,
                value: { family: familyName, position: lightPos },
                dependsOn: [familyName, `${familyName}-${defaultMapping?.dark.position ?? '50'}`],
              });
            }
            results.push({ source, target, action: 'set', ok: true, enriched });

            // Cascade to all semantic tokens in this family
            allCascadeTokens.push(
              ...this.cascadeSemanticFamily(registry, target, familyName, results),
            );
          } else {
            // Custom family -- the target name IS the family name, stored directly
            results.push({ source, target, action: 'create', ok: true, enriched });
          }
        } else {
          // Non-enriched value (plain string) -- store directly
          const tokenValue = value;
          const exists = registry.has(target);

          if (exists) {
            const existing = registry.get(target);
            if (existing) {
              const previousValue = existing.value;
              existing.userOverride = {
                previousValue:
                  typeof previousValue === 'string' ? previousValue : JSON.stringify(previousValue),
                reason: `Onboarded from ${source}: ${reason}`,
              };
              await registry.set(target, tokenValue);
              results.push({ source, target, action: 'set', ok: true, enriched });
            }
          } else {
            const ns = namespace ?? 'custom';
            const cat = category ?? ns;
            registry.add({
              name: target,
              namespace: ns,
              category: cat,
              value: tokenValue,
              containerQueryAware: true,
              userOverride: {
                previousValue: '',
                reason: `Onboarded from ${source}: ${reason}`,
              },
            });
            results.push({ source, target, action: 'create', ok: true, enriched });
          }
        }
      }

      // Batch cascade update -- single persist for all semantic surface tokens
      if (allCascadeTokens.length > 0) {
        await registry.setTokens(allCascadeTokens);
      }

      // Persist and regenerate once after all mappings
      await this.adapter.save(registry.list());
      const outputFiles = await this.regenerateOutputs(registry);

      const setCount = results.filter((r) => r.action === 'set' && r.ok).length;
      const createCount = results.filter((r) => r.action === 'create' && r.ok).length;
      const remapCount = results.filter((r) => r.action === 'remap' && r.ok).length;
      const cascadeCount = results.filter((r) => r.action === 'cascade' && r.ok).length;
      const enrichedCount = results.filter((r) => r.enriched).length;
      const failCount = results.filter((r) => !r.ok).length;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                ok: true,
                summary: {
                  set: setCount,
                  created: createCount,
                  remapped: remapCount,
                  cascaded: cascadeCount,
                  enriched: enrichedCount,
                  failed: failCount,
                },
                results,
                outputFiles,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error) {
      return this.handleError('mapTokens', error);
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
