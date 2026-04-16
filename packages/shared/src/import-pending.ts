/**
 * Import Pending Schema
 *
 * Stores tokens detected during `rafters init --onboard` or `rafters import`
 * that are awaiting user review. Written to `.rafters/import-pending.json`
 * after detection, consumed by CLI prompts and Studio review UI.
 *
 * Each entry captures:
 *   - The original source variable (name, value, file location)
 *   - The proposed Rafters token after mapping
 *   - User decision (pending, accepted, rejected, modified)
 *   - Confidence and rationale so the user understands the mapping
 */

import { z } from 'zod';
import { TokenSchema } from './types';

/**
 * Decision state for a pending import token.
 * Defaults to "pending" until the user reviews.
 */
export const ImportDecisionSchema = z.enum(['pending', 'accepted', 'rejected', 'modified']);

/**
 * Original source variable as parsed from the user's project
 */
export const ImportOriginalSchema = z.object({
  /** Original variable name (e.g., "--color-primary") */
  name: z.string(),
  /** Original value as written in source (e.g., "oklch(0.7 0.15 250)") */
  value: z.string(),
  /** Source file path relative to project root */
  source: z.string(),
  /** Line number where the variable was declared */
  line: z.number().optional(),
  /** Column number where the variable was declared */
  column: z.number().optional(),
});

/**
 * User modifications to a proposed token.
 * Only populated when decision is "modified".
 */
export const ImportModificationsSchema = z.object({
  name: z.string().optional(),
  value: z.string().optional(),
  category: z.string().optional(),
  namespace: z.string().optional(),
});

/**
 * A single token pending user review.
 */
export const PendingTokenSchema = z.object({
  /** Original token from source */
  original: ImportOriginalSchema,

  /** Proposed Rafters token (full Token schema) */
  proposed: TokenSchema,

  /** User decision -- pending until reviewed */
  decision: ImportDecisionSchema.default('pending'),

  /** User edits when decision is "modified" */
  modifications: ImportModificationsSchema.optional(),

  /** Detection confidence 0-1 */
  confidence: z.number().min(0).max(1),

  /** Why this mapping was proposed (e.g., "Tailwind --color-primary maps to primary-500") */
  rationale: z.string().optional(),
});

/**
 * Import-pending document written to `.rafters/import-pending.json`
 */
export const ImportPendingSchema = z.object({
  /** Schema version for future migrations */
  version: z.literal('1.0'),

  /** ISO-8601 timestamp when the import was detected */
  createdAt: z.string().datetime(),

  /** Which importer produced this pending list (e.g., "tailwind-v4", "shadcn") */
  detectedSystem: z.string(),

  /** Confidence that the detected system is correct */
  systemConfidence: z.number().min(0).max(1),

  /** Source file path(s) -- first entry is primary */
  source: z.string(),

  /** Additional source paths if more than one file was imported */
  additionalSources: z.array(z.string()).optional(),

  /** Warnings from the import process (parse issues, dedup skips, etc.) */
  warnings: z
    .array(
      z.object({
        level: z.enum(['info', 'warning', 'error']),
        message: z.string(),
      }),
    )
    .optional(),

  /** Tokens awaiting review */
  tokens: z.array(PendingTokenSchema),
});

export type ImportDecision = z.infer<typeof ImportDecisionSchema>;
export type ImportOriginal = z.infer<typeof ImportOriginalSchema>;
export type ImportModifications = z.infer<typeof ImportModificationsSchema>;
export type PendingToken = z.infer<typeof PendingTokenSchema>;
export type ImportPending = z.infer<typeof ImportPendingSchema>;
