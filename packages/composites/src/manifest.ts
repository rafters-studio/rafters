/**
 * Composite file schemas and types
 *
 * Validates `.composite.json` files - the JSON format for pre-built
 * block assemblies. Each composite has a manifest, I/O rule references,
 * and a flat array of blocks.
 */

import { z } from 'zod';

/** Categories for composite blocks */
export const CompositeCategorySchema = z.enum(['typography', 'layout', 'form', 'widget', 'media']);

export type CompositeCategory = z.infer<typeof CompositeCategorySchema>;

/** Zod schema for AppliedRule - simple name string or parameterized rule with config */
export const AppliedRuleSchema = z.union([
  z.string(),
  z.object({
    name: z.string().min(1),
    config: z.record(z.string(), z.unknown()),
  }),
]);

export type AppliedRule = z.infer<typeof AppliedRuleSchema>;

/** Zod schema for a single block in a composite */
export const CompositeBlockSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  content: z.unknown().optional(),
  children: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  rules: z.array(AppliedRuleSchema).optional(),
});

export type CompositeBlock = z.infer<typeof CompositeBlockSchema>;

/** Zod schema for a composite's manifest metadata */
export const CompositeManifestSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  category: CompositeCategorySchema,
  description: z.string(),
  keywords: z.array(z.string()),
  cognitiveLoad: z.number().int().min(1).max(10),
});

export type CompositeManifest = z.infer<typeof CompositeManifestSchema>;

/** Zod schema for a complete `.composite.json` file */
export const CompositeFileSchema = z.object({
  manifest: CompositeManifestSchema,
  input: z.array(z.string()).default([]),
  output: z.array(z.string()).default([]),
  blocks: z.array(CompositeBlockSchema).min(1),
});

export type CompositeFile = z.infer<typeof CompositeFileSchema>;
