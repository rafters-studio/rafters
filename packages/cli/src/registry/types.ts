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
 * `lib` and `hooks` are the behavior-layer runtime substrate (the score
 * contract, compose slices, the reactive hooks). They are copy-in shared
 * dependencies resolved exactly like primitives, but installed to their own
 * dirs (`@/lib`, `@/hooks`) rather than `@/lib/primitives`.
 */
export const RegistryItemTypeSchema = z.enum([
  'ui',
  'primitive',
  'composite',
  'rule',
  'lib',
  'hooks',
]);

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
  lib: z.array(z.string()).default([]),
  hooks: z.array(z.string()).default([]),
});

export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
