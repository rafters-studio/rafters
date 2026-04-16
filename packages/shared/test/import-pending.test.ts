/**
 * Unit tests for ImportPending schemas
 */

import { describe, expect, it } from 'vitest';
import {
  ImportDecisionSchema,
  ImportOriginalSchema,
  ImportPendingSchema,
  PendingTokenSchema,
} from '../src/import-pending.js';
import type { Token } from '../src/types.js';

const validProposedToken: Token = {
  name: 'primary-500',
  value: 'oklch(0.55 0.15 250)',
  category: 'color',
  namespace: 'color',
  userOverride: null,
  containerQueryAware: true,
};

describe('ImportDecisionSchema', () => {
  it('accepts all four decision values', () => {
    expect(ImportDecisionSchema.parse('pending')).toBe('pending');
    expect(ImportDecisionSchema.parse('accepted')).toBe('accepted');
    expect(ImportDecisionSchema.parse('rejected')).toBe('rejected');
    expect(ImportDecisionSchema.parse('modified')).toBe('modified');
  });

  it('rejects unknown decisions', () => {
    expect(() => ImportDecisionSchema.parse('deferred')).toThrow();
  });
});

describe('ImportOriginalSchema', () => {
  it('requires name, value, source', () => {
    const original = {
      name: '--color-primary',
      value: 'oklch(0.7 0.15 250)',
      source: 'app/globals.css',
    };
    expect(() => ImportOriginalSchema.parse(original)).not.toThrow();
  });

  it('allows optional line and column', () => {
    const original = {
      name: '--color-primary',
      value: 'oklch(0.7 0.15 250)',
      source: 'app/globals.css',
      line: 42,
      column: 3,
    };
    const parsed = ImportOriginalSchema.parse(original);
    expect(parsed.line).toBe(42);
    expect(parsed.column).toBe(3);
  });

  it('rejects missing name', () => {
    const bad = { value: 'oklch(0.7 0.15 250)', source: 'app/globals.css' };
    expect(() => ImportOriginalSchema.parse(bad)).toThrow();
  });
});

describe('PendingTokenSchema', () => {
  const validPending = {
    original: {
      name: '--color-primary',
      value: 'oklch(0.7 0.15 250)',
      source: 'app/globals.css',
      line: 42,
    },
    proposed: validProposedToken,
    confidence: 0.95,
    rationale: 'Tailwind --color-primary maps to primary-500',
  };

  it('validates a minimal pending token', () => {
    expect(() => PendingTokenSchema.parse(validPending)).not.toThrow();
  });

  it('defaults decision to pending', () => {
    const parsed = PendingTokenSchema.parse(validPending);
    expect(parsed.decision).toBe('pending');
  });

  it('accepts explicit decision', () => {
    const parsed = PendingTokenSchema.parse({ ...validPending, decision: 'accepted' });
    expect(parsed.decision).toBe('accepted');
  });

  it('accepts modifications when decision is modified', () => {
    const withMods = {
      ...validPending,
      decision: 'modified' as const,
      modifications: { name: 'brand-500', value: 'oklch(0.6 0.2 280)' },
    };
    const parsed = PendingTokenSchema.parse(withMods);
    expect(parsed.modifications?.name).toBe('brand-500');
  });

  it('rejects confidence outside 0-1', () => {
    expect(() => PendingTokenSchema.parse({ ...validPending, confidence: 1.5 })).toThrow();
    expect(() => PendingTokenSchema.parse({ ...validPending, confidence: -0.1 })).toThrow();
  });

  it('rejects modifications when decision is not modified', () => {
    const bad = {
      ...validPending,
      decision: 'accepted' as const,
      modifications: { name: 'brand-500' },
    };
    expect(() => PendingTokenSchema.parse(bad)).toThrow(/only allowed when decision is 'modified'/);
  });

  it('rejects decision modified without modifications', () => {
    const bad = { ...validPending, decision: 'modified' as const };
    expect(() => PendingTokenSchema.parse(bad)).toThrow(/modifications are missing/);
  });

  it('rejects empty modifications object', () => {
    const bad = {
      ...validPending,
      decision: 'modified' as const,
      modifications: {},
    };
    expect(() => PendingTokenSchema.parse(bad)).toThrow(/must change at least one field/);
  });

  it('rejects unknown keys (strict mode)', () => {
    const bad = { ...validPending, unknownField: 'oops' };
    expect(() => PendingTokenSchema.parse(bad)).toThrow();
  });
});

describe('ImportPendingSchema', () => {
  const validDocument = {
    version: '1.0' as const,
    createdAt: '2026-04-15T12:00:00.000Z',
    detectedSystem: 'tailwind-v4',
    systemConfidence: 0.92,
    source: 'app/globals.css',
    tokens: [
      {
        original: {
          name: '--color-primary',
          value: 'oklch(0.7 0.15 250)',
          source: 'app/globals.css',
        },
        proposed: validProposedToken,
        confidence: 0.95,
      },
    ],
  };

  it('validates a complete import-pending document', () => {
    expect(() => ImportPendingSchema.parse(validDocument)).not.toThrow();
  });

  it('rejects version other than 1.0', () => {
    expect(() => ImportPendingSchema.parse({ ...validDocument, version: '2.0' })).toThrow();
  });

  it('rejects non-ISO datetime', () => {
    expect(() =>
      ImportPendingSchema.parse({ ...validDocument, createdAt: 'not-a-date' }),
    ).toThrow();
  });

  it('accepts empty tokens array', () => {
    const empty = { ...validDocument, tokens: [] };
    expect(() => ImportPendingSchema.parse(empty)).not.toThrow();
  });

  it('accepts optional warnings', () => {
    const withWarnings = {
      ...validDocument,
      warnings: [
        { level: 'info' as const, message: 'Duplicate token skipped' },
        { level: 'warning' as const, message: 'Unrecognized namespace' },
      ],
    };
    const parsed = ImportPendingSchema.parse(withWarnings);
    expect(parsed.warnings).toHaveLength(2);
  });

  it('accepts optional additionalSources', () => {
    const multiSource = {
      ...validDocument,
      additionalSources: ['app/theme.css', 'src/overrides.css'],
    };
    const parsed = ImportPendingSchema.parse(multiSource);
    expect(parsed.additionalSources).toHaveLength(2);
  });

  it('rejects systemConfidence outside 0-1', () => {
    expect(() => ImportPendingSchema.parse({ ...validDocument, systemConfidence: 1.5 })).toThrow();
    expect(() => ImportPendingSchema.parse({ ...validDocument, systemConfidence: -0.1 })).toThrow();
  });

  it('rejects unknown top-level keys (strict mode)', () => {
    const bad = { ...validDocument, typoKey: 'oops' };
    expect(() => ImportPendingSchema.parse(bad)).toThrow();
  });
});
