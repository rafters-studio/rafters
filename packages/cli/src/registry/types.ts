/**
 * Registry Types
 *
 * Types for component and primitive registry items.
 * Compatible with shadcn-style registry format.
 */

import { z } from 'zod';

/**
 * A single file in a registry item
 * Framework inferred from extension: .tsx=React, .vue=Vue, .svelte=Svelte
 */
export const RegistryFileSchema = z.object({
  path: z.string(),
  content: z.string(),
  dependencies: z.array(z.string()), // e.g., ["lodash@4.17.21"] - versioned
  devDependencies: z.array(z.string()).default([]), // e.g., ["vitest"] - from @devDependencies JSDoc
});

export type RegistryFile = z.infer<typeof RegistryFileSchema>;

/**
 * Item type in registry.
 * `substrate` is the behavior-layer runtime (the score contract, compose
 * slices, reactive hooks -- everything under ui/src outside components /
 * primitives / composites). It is a copy-in shared dependency resolved like a
 * primitive; the specific dir it installs into (`@/lib`, `@/hooks`, ...) is
 * carried in the item's file path, so the type never grows per kind.
 */
export const RegistryItemTypeSchema = z.enum(['ui', 'primitive', 'composite', 'rule', 'substrate']);

export type RegistryItemType = z.infer<typeof RegistryItemTypeSchema>;

/**
 * Design intelligence carried per-component. The registry generator
 * extracts these from JSDoc tags on the component source (see
 * `@cognitive-load`, `@attention-economics`, `@trust-building`,
 * `@accessibility`, `@semantic-meaning`, `@usage-patterns` in e.g.
 * packages/ui/src/components/ui/button.tsx). Surfacing this is the
 * whole point of rafters -- agents read the encoded judgment instead
 * of guessing at the design surface.
 */
export const RegistryItemIntelligenceSchema = z.object({
  cognitiveLoad: z.number().optional(),
  attentionEconomics: z.string().optional(),
  trustBuilding: z.string().optional(),
  accessibility: z.string().optional(),
  semanticMeaning: z.string().optional(),
  usagePatterns: z
    .object({
      dos: z.array(z.string()).default([]),
      nevers: z.array(z.string()).default([]),
    })
    .optional(),
});

export type RegistryItemIntelligence = z.infer<typeof RegistryItemIntelligenceSchema>;

/**
 * The framework targets a component can be built for. One target == one source
 * extension (`.tsx` -> react, `.astro` -> astro, `.vue` -> vue, `.svelte` ->
 * svelte, `.element.ts` -> wc). See COMPONENT_EXTENSIONS in the registry
 * generator (apps/registry/src/lib/registry/componentService.ts).
 */
export const ComponentTargetSchema = z.enum(['react', 'astro', 'vue', 'svelte', 'wc']);
export type ComponentTarget = z.infer<typeof ComponentTargetSchema>;

/**
 * One prop's machine-actionable shape. Kept byte-compatible with #2072's
 * `PropNode` (packages/cli/src/mcp/graph.ts) so `describe(<id>.props.<name>)`
 * resolves generator output directly.
 *
 * NOTE: the enum arm's `values` is intentionally NOT `.min(1)`. A verbatim
 * literal union always yields >=1 member, but a REQUIRED structural prop with
 * no literal domain (e.g. astro's `id: string`) is emitted as an empty-values
 * enum carrying only `required: true` -- honest ("no known value domain"),
 * never a fabricated `['string']`. This is the one deliberate divergence from
 * the issue's literal `.min(1)` schema; graph.ts's PropNode has no min either,
 * so byte-compatibility holds.
 */
export const PropFieldSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('enum'),
    values: z.array(z.string()), // verbatim literal union members -- never "string"
    default: z.string().optional(),
    required: z.boolean().optional(),
    constraint: z
      .object({
        when: z.object({ prop: z.string(), matches: z.string() }),
        requires: z.object({ prop: z.string() }),
      })
      .optional(),
  }),
  z.object({
    type: z.literal('boolean'),
    default: z.boolean().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('string'),
    default: z.string().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    type: z.literal('number'),
    default: z.number().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    // Matches #2072's PropNode 'grammar' arm exactly, so graph.ts's
    // describe(<id>.props.<name>.vocab) drill has real shape data.
    type: z.literal('grammar'),
    grammar: z.array(z.string()).min(1), // grammar shape tokens, e.g. ['word', 'word/alpha']
    vocab: z.string(), // drillable addr, e.g. 'container.props.fill.vocab' -- never inlined
    onInvalid: z.literal('silent-noop'),
    default: z.string().optional(),
  }),
  z.object({
    type: z.literal('deprecated'),
    deprecatedFor: z.string(),
  }),
]);
export type PropField = z.infer<typeof PropFieldSchema>;

/**
 * One target's extracted prop surface: verbatim literal-union props, the
 * slots/events it exposes, and a target-correct usage snippet.
 */
export const FacetSchema = z.object({
  props: z.record(z.string(), PropFieldSchema),
  slots: z.array(z.string()).optional(),
  events: z.array(z.string()).optional(),
  snippet: z.string(),
});
export type Facet = z.infer<typeof FacetSchema>;

/**
 * A component or primitive in the registry
 */
export const RegistryItemSchema = z.object({
  name: z.string(),
  type: RegistryItemTypeSchema,
  description: z.string().optional(),
  primitives: z.array(z.string()),
  files: z.array(RegistryFileSchema),
  rules: z.array(z.string()).default([]),
  composites: z.array(z.string()).default([]),
  intelligence: RegistryItemIntelligenceSchema.optional(),
  // Per-target facets. zod v4's `z.record(enum, ...)` demands EVERY enum key be
  // present; a component built for only some targets must parse, so this is a
  // partial record (only the built targets appear).
  facets: z.partialRecord(ComponentTargetSchema, FacetSchema).default({}),
  parent: z.string().optional(),
});

export type RegistryItem = z.infer<typeof RegistryItemSchema>;

/**
 * Registry index listing available components and primitives
 */
export const RegistryIndexSchema = z.object({
  name: z.string(),
  homepage: z.string(),
  components: z.array(z.string()),
  primitives: z.array(z.string()),
  composites: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  substrate: z.array(z.string()).default([]),
});

export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
