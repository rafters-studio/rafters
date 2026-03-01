/**
 * Composite manifest types and validation
 *
 * A composite is a pre-built, drag-and-drop-ready block assembly.
 * Each composite declares its manifest, a Preview component (for palette),
 * and a Render component (for canvas).
 */

import type { EditorBlock } from '@rafters/ui';
import { z } from 'zod';

/** Categories for composite blocks */
export const CompositeCategorySchema = z.enum(['typography', 'layout', 'form', 'widget', 'media']);

export type CompositeCategory = z.infer<typeof CompositeCategorySchema>;

/**
 * Zod schema for EditorBlock without the `id` field.
 * Provides runtime validation matching the EditorBlock interface shape.
 */
const EditorBlockWithoutIdSchema = z.object({
  type: z.string().min(1),
  content: z.unknown(),
  children: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
}) satisfies z.ZodType<Omit<EditorBlock, 'id'>>;

/** Zod schema for composite manifest validation */
export const CompositeManifestSchema = z.object({
  /** Unique composite ID (e.g., 'heading', 'paragraph') */
  id: z.string().min(1),
  /** Human-readable name */
  name: z.string().min(1),
  /** Category for palette grouping */
  category: CompositeCategorySchema,
  /** Short description */
  description: z.string(),
  /** Search keywords for palette fuzzy matching */
  keywords: z.array(z.string()),
  /** Cognitive load score (1-10) */
  cognitiveLoad: z.number().int().min(1).max(10),
  /** Default block data when dragged onto canvas */
  defaultBlock: EditorBlockWithoutIdSchema,
});

export type CompositeManifest = z.infer<typeof CompositeManifestSchema>;

/** Runtime composite definition including React components */
export interface CompositeDefinition {
  manifest: CompositeManifest;
  /** Preview component for palette display. Receives optional scale prop. */
  Preview: React.ComponentType<{ scale?: number }>;
  /** Render component for canvas display */
  Render: React.ComponentType<{
    block: EditorBlock;
    context: { index: number; total: number; isSelected: boolean; isFocused: boolean };
  }>;
}
