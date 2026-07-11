/**
 * Schema for one line of components.jsonl -- the component matrix.
 *
 * The matrix is a tracking file: what a component is, what it composes,
 * its states and motion intents, and per-target port status. It never
 * restates a primitive's contract (that lives in src/primitives/) and it
 * is updated by the porting agent in the same commit as the port
 * (closing directive 1 on every port issue).
 */
import { z } from 'zod';

const wordSafe = /^[a-z][a-z0-9-]*$/;

export const ARCHETYPES = [
  'static',
  'simple-interactive',
  'toggle-family',
  'text-input-family',
  'disclosure',
  'modal-overlay',
  'non-modal-overlay',
  'menu-collection-popup',
  'compound',
] as const;

/** Port status per file. `verified` requires the conformance suite green. */
export const FileStatusSchema = z.enum(['missing', 'specced', 'ported', 'verified']);

export const MotionIntentSchema = z
  .string()
  .refine(
    (s) => !/\d+ms|cubic-bezier|duration-\d/.test(s),
    'motion intents never carry durations or beziers (Spec 04)',
  );

/** Published-artifact provenance (RFC 2026-07-10-provenance-fingerprint).
 *  Minted by the publish pipeline; absent until an item is published. */
export const ProvenanceSchema = z.object({
  version: z.string(),
  /** sha256 over the file bytes with the fingerprint line removed. */
  fingerprint: z.string(),
  /** ed25519 signature over the fingerprint, rafters publish key. */
  signature: z.string().optional(),
});

export const ComponentLineSchema = z.object({
  /** Line-shape discriminator, settled with veneer (their lines carry
   *  veneer.doc/1, veneer.index/1). Bump on breaking shape change. */
  schema: z.literal('rafters.component-line/1'),
  name: z.string().regex(wordSafe),
  archetype: z.enum(ARCHETYPES),
  status: z.enum(['ported', 'pending']),
  provenance: ProvenanceSchema.optional(),

  /** One sentence: what it is. */
  is: z.string().min(1),
  /** One sentence: what it does. */
  does: z.string().min(1),

  /** State vocabulary, descriptive (open, checked, value...). Empty for statics. */
  states: z.array(z.string()),

  uses: z.object({
    /** Primitives the implementation imports today (evidence, not intent). */
    current: z.array(z.string().regex(wordSafe)),
    /** Primitives the port adds. */
    planned: z.array(z.string().regex(wordSafe)),
    /** Set on controller-era components: behavior lives in rejected code. */
    note: z.string().optional(),
  }),

  motion: z.object({
    /** Utilities found in the current classes (evidence). */
    current: z.string(),
    /** Spec 04 intents the port declares. */
    intents: z.array(MotionIntentSchema),
  }),

  frameworks: z.object({
    behaviorLayer: z.object({
      react: FileStatusSchema,
      astro: FileStatusSchema,
      wc: FileStatusSchema,
      vue: FileStatusSchema,
    }),
    /** What the old tree ships, for interim use. */
    oldTree: z.array(z.enum(['react', 'astro', 'wc'])),
  }),
});

export type ComponentLine = z.infer<typeof ComponentLineSchema>;
