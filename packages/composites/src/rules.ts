/**
 * Rule name matching
 *
 * Checks whether composites can connect based on named I/O rules.
 * Matching is by exact name, not structural type comparison.
 */

import type { z } from 'zod';
import { credentials, email, password, required, url } from './built-in-rules';
import type { AppliedRule, CompositeFile } from './manifest';

export interface RuleMatch {
  /** Rules that match between output and input */
  matched: string[];
  /** Rules required by input but not produced by output */
  missing: string[];
  /** Rules produced by output but not required by input */
  extra: string[];
  /** Whether all input requirements are satisfied */
  compatible: boolean;
}

/**
 * Check if producer's output satisfies consumer's input.
 */
export function matchRules(producer: CompositeFile, consumer: CompositeFile): RuleMatch {
  const outputSet = new Set(producer.output);
  const inputSet = new Set(consumer.input);

  const matched: string[] = [];
  const missing: string[] = [];

  for (const rule of consumer.input) {
    if (outputSet.has(rule)) {
      matched.push(rule);
    } else {
      missing.push(rule);
    }
  }

  const extra: string[] = [];
  for (const rule of producer.output) {
    if (!inputSet.has(rule)) {
      extra.push(rule);
    }
  }

  return { matched, missing, extra, compatible: missing.length === 0 };
}

/**
 * Find all composites that can consume the output of the given producer.
 */
export function findCompatibleConsumers(
  producer: CompositeFile,
  candidates: CompositeFile[],
): CompositeFile[] {
  return candidates.filter((candidate) => matchRules(producer, candidate).compatible);
}

/**
 * Find all composites that can produce the input required by the given consumer.
 */
export function findCompatibleProducers(
  consumer: CompositeFile,
  candidates: CompositeFile[],
): CompositeFile[] {
  return candidates.filter((candidate) => matchRules(candidate, consumer).compatible);
}

// =============================================================================
// Runtime validation
// =============================================================================

/** Maps a rule name to the Zod schema its block content must satisfy. */
export type RuleRegistry = Record<string, z.ZodTypeAny>;

/** The built-in rule schemas, keyed by name. The default validation registry. */
export const builtInRules: RuleRegistry = { credentials, email, password, required, url };

/** A single block-level rule validation failure. */
export interface BlockValidationError {
  blockId: string;
  rule: string;
  message: string;
}

/** A block carrying applied rules whose content can be validated. */
export interface ValidatableBlock {
  id: string;
  content?: unknown;
  rules?: AppliedRule[];
}

/** Coerce a block's content into the plain string the rule schemas validate. */
function contentToText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((segment) =>
        segment && typeof segment === 'object' && 'text' in segment
          ? String((segment as { text: unknown }).text)
          : '',
      )
      .join('');
  }
  return '';
}

/**
 * Validate each block's content against the Zod schemas of the rules attached
 * to it. Walks the blocks, resolves every rule name to a schema in the registry
 * (built-in by default), runs `safeParse` against the block's text content, and
 * accumulates per-block failures. A rule with no schema in the registry is
 * reported rather than silently passed -- the previous behavior was name-only
 * matching with no runtime check at all.
 */
export function validateBlocks(
  blocks: ValidatableBlock[],
  registry: RuleRegistry = builtInRules,
): BlockValidationError[] {
  const errors: BlockValidationError[] = [];

  for (const block of blocks) {
    if (!block.rules) continue;
    const text = contentToText(block.content);

    for (const applied of block.rules) {
      const rule = typeof applied === 'string' ? applied : applied.name;
      const schema = registry[rule];

      if (!schema) {
        errors.push({ blockId: block.id, rule, message: `Unknown rule: "${rule}"` });
        continue;
      }

      const result = schema.safeParse(text);
      if (!result.success) {
        errors.push({
          blockId: block.id,
          rule,
          message: result.error.issues[0]?.message ?? 'Validation failed',
        });
      }
    }
  }

  return errors;
}
