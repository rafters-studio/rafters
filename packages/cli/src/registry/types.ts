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
 * Item type in registry
 */
export const RegistryItemTypeSchema = z.enum(['ui', 'primitive', 'composite']);

export type RegistryItemType = z.infer<typeof RegistryItemTypeSchema>;

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
});

export type RegistryIndex = z.infer<typeof RegistryIndexSchema>;
