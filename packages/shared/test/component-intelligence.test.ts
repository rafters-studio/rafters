/**
 * Unit tests for component intelligence parsing utilities
 * Tests JSDoc parsing, variant/size extraction, and dependency detection
 */

import { describe, expect, it } from 'vitest';
import {
  extractDependencies,
  extractJSDocDependencies,
  extractPrimitiveDependencies,
  extractSizes,
  extractVariants,
  parseDescription,
  parseJSDocIntelligence,
  toDisplayName,
  validateComponentIntelligence,
} from '../src/component-intelligence.js';

describe('parseJSDocIntelligence', () => {
  it('returns undefined for source without JSDoc', () => {
    const source = `export function Button() { return <button>Click</button>; }`;
    expect(parseJSDocIntelligence(source)).toBeUndefined();
  });

  it('returns undefined for empty JSDoc', () => {
    const source = `/** */\nexport function Button() {}`;
    expect(parseJSDocIntelligence(source)).toBeUndefined();
  });

  it('parses cognitive load as number/10 format', () => {
    const source = `/**
 * @cognitive-load 6/10 - Moderate complexity
 */
export function Dialog() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.cognitiveLoad).toBe(6);
  });

  it('parses cognitive load as standalone number', () => {
    const source = `/**
 * @cognitiveLoad 3
 */
export function Button() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.cognitiveLoad).toBe(3);
  });

  it('parses attention economics', () => {
    const source = `/**
 * @attention-economics Demands full attention. Use sparingly.
 */
export function AlertDialog() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.attentionEconomics).toBe('Demands full attention. Use sparingly.');
  });

  it('parses accessibility notes', () => {
    const source = `/**
 * @accessibility Focus trap required, ESC to close
 */
export function Dialog() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.accessibility).toBe('Focus trap required, ESC to close');
  });

  it('parses trust building patterns', () => {
    const source = `/**
 * @trust-building Two-step confirmation for destructive actions
 */
export function AlertDialog() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.trustBuilding).toBe('Two-step confirmation for destructive actions');
  });

  it('parses semantic meaning', () => {
    const source = `/**
 * @semantic-meaning High-stakes decision requiring explicit user action
 */
export function AlertDialog() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.semanticMeaning).toBe('High-stakes decision requiring explicit user action');
  });

  it('parses individual @do tags', () => {
    const source = `/**
 * @do Use for irreversible actions
 * @do Provide clear action descriptions
 */
export function AlertDialog() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.usagePatterns?.dos).toContain('Use for irreversible actions');
    expect(result?.usagePatterns?.dos).toContain('Provide clear action descriptions');
  });

  it('parses individual @never tags', () => {
    const source = `/**
 * @never Use for informational content
 * @never Stack multiple dialogs
 */
export function Dialog() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.usagePatterns?.nevers).toContain('Use for informational content');
    expect(result?.usagePatterns?.nevers).toContain('Stack multiple dialogs');
  });

  it('parses inline usage patterns with DO:/NEVER: format', () => {
    const source = `/**
 * @usage-patterns DO: Use for primary actions NEVER: Use alone without context
 */
export function Button() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.usagePatterns?.dos).toContain('Use for primary actions');
    expect(result?.usagePatterns?.nevers).toContain('Use alone without context');
  });

  it('handles text containing D and N letters in usage patterns', () => {
    // This tests the regex fix for [^DN] pattern bug
    const source = `/**
 * @usage-patterns DO: Default behavior is Normal NEVER: Dangerous operations
 */
export function Button() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.usagePatterns?.dos).toContain('Default behavior is Normal');
    expect(result?.usagePatterns?.nevers).toContain('Dangerous operations');
  });

  it('parses complete intelligence block', () => {
    const source = `/**
 * Button Component
 * @cognitive-load 3/10
 * @attention-economics Low attention cost, familiar interaction
 * @accessibility Keyboard accessible, focus visible
 * @trust-building Standard interaction pattern
 * @semantic-meaning User action trigger
 * @do Use consistent variants
 * @never Use without clear purpose
 */
export function Button() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.cognitiveLoad).toBe(3);
    expect(result?.attentionEconomics).toBe('Low attention cost, familiar interaction');
    expect(result?.accessibility).toBe('Keyboard accessible, focus visible');
    expect(result?.trustBuilding).toBe('Standard interaction pattern');
    expect(result?.semanticMeaning).toBe('User action trigger');
    expect(result?.usagePatterns?.dos).toContain('Use consistent variants');
    expect(result?.usagePatterns?.nevers).toContain('Use without clear purpose');
  });

  it('rejects cognitive load outside 0-10 range', () => {
    const source = `/**
 * @cognitive-load 15
 */
export function Widget() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.cognitiveLoad).toBeUndefined();
  });

  it('supports camelCase tag variants', () => {
    const source = `/**
 * @cognitiveLoad 5
 * @attentionEconomics Moderate
 * @trustBuilding Standard
 * @semanticMeaning Action
 */
export function Component() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.cognitiveLoad).toBe(5);
    expect(result?.attentionEconomics).toBe('Moderate');
    expect(result?.trustBuilding).toBe('Standard');
    expect(result?.semanticMeaning).toBe('Action');
  });
});

// ==================== Real-world component JSDoc blocks ====================

describe('parseJSDocIntelligence - real-world components', () => {
  it('parses verbatim button.tsx JSDoc', () => {
    const source = `/**
 * Interactive button component for user actions
 *
 * @cognitive-load 3/10 - Simple action trigger with clear visual hierarchy
 * @attention-economics Size hierarchy: sm=tertiary actions, default=secondary interactions, lg=primary calls-to-action. Primary variant commands highest attention - use sparingly (maximum 1 per section)
 * @trust-building Destructive actions require confirmation patterns. Loading states prevent double-submission. Visual feedback reinforces user actions.
 * @accessibility WCAG AAA compliant with 44px minimum touch targets, high contrast ratios, and screen reader optimization
 * @semantic-meaning Variant mapping: default=main actions, secondary=supporting actions, destructive=irreversible actions with safety patterns
 *
 * @usage-patterns
 * DO: Primary: Main user goal, maximum 1 per section
 * DO: Secondary: Alternative paths, supporting actions
 * DO: Destructive: Permanent actions, requires confirmation patterns
 * NEVER: Multiple primary buttons competing for attention
 */
export function Button() {}`;

    const result = parseJSDocIntelligence(source);
    expect(result).toBeDefined();
    expect(result?.cognitiveLoad).toBe(3);
    expect(result?.attentionEconomics).toContain('Size hierarchy');
    expect(result?.trustBuilding).toContain('Destructive actions require confirmation');
    expect(result?.accessibility).toContain('WCAG AAA');
    expect(result?.semanticMeaning).toContain('Variant mapping');
    expect(result?.usagePatterns?.dos).toHaveLength(3);
    expect(result?.usagePatterns?.dos).toContain('Primary: Main user goal, maximum 1 per section');
    expect(result?.usagePatterns?.dos).toContain(
      'Secondary: Alternative paths, supporting actions',
    );
    expect(result?.usagePatterns?.dos).toContain(
      'Destructive: Permanent actions, requires confirmation patterns',
    );
    expect(result?.usagePatterns?.nevers).toHaveLength(1);
    expect(result?.usagePatterns?.nevers).toContain(
      'Multiple primary buttons competing for attention',
    );
  });

  it('parses verbatim dialog.tsx JSDoc', () => {
    const source = `/**
 * Modal dialog component with focus management and escape patterns
 *
 * @cognitive-load 6/10 - Interrupts user flow, requires decision making
 * @attention-economics Attention capture: modal=full attention, drawer=partial attention, popover=contextual attention
 * @trust-building Clear close mechanisms, confirmation for destructive actions, non-blocking for informational content
 * @accessibility Focus trapping, escape key handling, backdrop dismissal, screen reader announcements
 * @semantic-meaning Usage patterns: modal=blocking workflow, drawer=supplementary, alert=urgent information
 *
 * @usage-patterns
 * DO: Low trust - Quick confirmations, save draft (size=sm, minimal friction)
 * DO: Medium trust - Publish content, moderate consequences (clear context)
 * DO: High trust - Payments, significant impact (detailed explanation)
 * DO: Critical trust - Account deletion, permanent loss (progressive confirmation)
 * NEVER: Routine actions, non-essential interruptions
 */
export function Dialog() {}`;

    const result = parseJSDocIntelligence(source);
    expect(result).toBeDefined();
    expect(result?.cognitiveLoad).toBe(6);
    expect(result?.usagePatterns?.dos).toHaveLength(4);
    expect(result?.usagePatterns?.dos?.[0]).toContain('Low trust');
    expect(result?.usagePatterns?.dos?.[3]).toContain('Critical trust');
    expect(result?.usagePatterns?.nevers).toHaveLength(1);
    expect(result?.usagePatterns?.nevers).toContain('Routine actions, non-essential interruptions');
  });

  it('parses verbatim table.tsx JSDoc with many DO/NEVER lines', () => {
    const source = `/**
 * Table component for displaying structured data in rows and columns
 *
 * @cognitive-load 3/10 - Familiar grid pattern; visual scanning is natural
 * @attention-economics Low attention cost: structured data is easy to scan
 * @trust-building Clear headers, consistent alignment, visible row separation
 * @accessibility Semantic table elements, proper scope attributes, keyboard navigable
 * @semantic-meaning Data presentation: lists, comparisons, structured information
 *
 * @usage-patterns
 * DO: Use for structured, comparable data
 * DO: Provide clear column headers
 * DO: Use consistent alignment (left for text, right for numbers)
 * DO: Support sorting and filtering for large datasets
 * DO: Consider sticky headers for long tables
 * NEVER: Use for layout purposes (use CSS Grid instead)
 * NEVER: Nest tables within tables
 * NEVER: Hide header row
 */
export function Table() {}`;

    const result = parseJSDocIntelligence(source);
    expect(result).toBeDefined();
    expect(result?.cognitiveLoad).toBe(3);
    expect(result?.usagePatterns?.dos).toHaveLength(5);
    expect(result?.usagePatterns?.nevers).toHaveLength(3);
    expect(result?.usagePatterns?.nevers).toContain(
      'Use for layout purposes (use CSS Grid instead)',
    );
    expect(result?.usagePatterns?.nevers).toContain('Nest tables within tables');
    expect(result?.usagePatterns?.nevers).toContain('Hide header row');
  });
});

// ==================== Edge cases ====================

describe('parseJSDocIntelligence - edge cases', () => {
  it('handles empty @usage-patterns block (no DO: or NEVER: lines)', () => {
    const source = `/**
 * @usage-patterns
 */
export function Widget() {}`;
    const result = parseJSDocIntelligence(source);
    // Tag is present so usagePatterns is created, but with empty arrays
    expect(result).toBeDefined();
    expect(result?.usagePatterns?.dos).toEqual([]);
    expect(result?.usagePatterns?.nevers).toEqual([]);
  });

  it('handles DO: with no text after it', () => {
    const source = `/**
 * @usage-patterns
 * DO:
 * NEVER: Do not use without context
 */
export function Widget() {}`;
    const result = parseJSDocIntelligence(source);
    // DO: with no text should not produce an empty string entry
    expect(result?.usagePatterns?.dos).toEqual([]);
    expect(result?.usagePatterns?.nevers).toEqual(['Do not use without context']);
  });

  it('handles NEVER: with colons in the text', () => {
    const source = `/**
 * @usage-patterns
 * DO: Use size mapping: sm=compact, lg=spacious
 * NEVER: Ignore the pattern: always provide context
 */
export function Widget() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.usagePatterns?.dos).toContain('Use size mapping: sm=compact, lg=spacious');
    expect(result?.usagePatterns?.nevers).toContain('Ignore the pattern: always provide context');
  });

  it('handles mixed format: both @do tags and DO: under @usage-patterns', () => {
    const source = `/**
 * @usage-patterns
 * DO: Use for primary actions
 * NEVER: Stack multiple instances
 * @do Also use for secondary actions
 * @never Also never use alone
 */
export function Widget() {}`;
    const result = parseJSDocIntelligence(source);
    // Both formats should merge into the same arrays
    expect(result?.usagePatterns?.dos).toContain('Use for primary actions');
    expect(result?.usagePatterns?.dos).toContain('Also use for secondary actions');
    expect(result?.usagePatterns?.nevers).toContain('Stack multiple instances');
    expect(result?.usagePatterns?.nevers).toContain('Also never use alone');
  });

  it('parses all 6 intelligence tags correctly in one block', () => {
    const source = `/**
 * Complete component
 *
 * @cognitive-load 7/10 - High complexity requiring careful attention
 * @attention-economics Demands significant user focus
 * @trust-building Progressive disclosure builds confidence
 * @accessibility Full keyboard navigation, ARIA live regions
 * @semantic-meaning Complex workflow orchestration
 *
 * @usage-patterns
 * DO: Break complex flows into steps
 * NEVER: Present all options simultaneously
 */
export function CompleteComponent() {}`;

    const result = parseJSDocIntelligence(source);
    expect(result).toBeDefined();
    expect(result?.cognitiveLoad).toBe(7);
    expect(result?.attentionEconomics).toBe('Demands significant user focus');
    expect(result?.trustBuilding).toBe('Progressive disclosure builds confidence');
    expect(result?.accessibility).toBe('Full keyboard navigation, ARIA live regions');
    expect(result?.semanticMeaning).toBe('Complex workflow orchestration');
    expect(result?.usagePatterns?.dos).toEqual(['Break complex flows into steps']);
    expect(result?.usagePatterns?.nevers).toEqual(['Present all options simultaneously']);
  });

  it('handles cognitive load at boundary values (0 and 10)', () => {
    const source0 = `/**\n * @cognitive-load 0/10\n */\nexport function A() {}`;
    const source10 = `/**\n * @cognitive-load 10/10\n */\nexport function B() {}`;
    expect(parseJSDocIntelligence(source0)?.cognitiveLoad).toBe(0);
    expect(parseJSDocIntelligence(source10)?.cognitiveLoad).toBe(10);
  });

  it('handles negative cognitive load', () => {
    const source = `/**\n * @cognitive-load -1\n */\nexport function A() {}`;
    expect(parseJSDocIntelligence(source)?.cognitiveLoad).toBeUndefined();
  });

  it('handles multiple DO: on a single line (inline format)', () => {
    const source = `/**
 * @usage-patterns DO: First pattern DO: Second pattern NEVER: Bad pattern
 */
export function Widget() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.usagePatterns?.dos).toContain('First pattern');
    expect(result?.usagePatterns?.dos).toContain('Second pattern');
    expect(result?.usagePatterns?.nevers).toContain('Bad pattern');
  });

  it('handles parentheses inside NEVER: text', () => {
    const source = `/**
 * @usage-patterns
 * NEVER: Use for layout purposes (use CSS Grid instead)
 */
export function Widget() {}`;
    const result = parseJSDocIntelligence(source);
    expect(result?.usagePatterns?.nevers).toContain(
      'Use for layout purposes (use CSS Grid instead)',
    );
  });
});

// ==================== Validation ====================

describe('validateComponentIntelligence', () => {
  it('returns missing warning when intelligence is undefined', () => {
    const warnings = validateComponentIntelligence('Button', undefined);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.level).toBe('missing');
    expect(warnings[0]?.message).toContain('Button');
    expect(warnings[0]?.message).toContain('No intelligence metadata found');
  });

  it('returns no warnings for complete intelligence', () => {
    const warnings = validateComponentIntelligence('Button', {
      cognitiveLoad: 3,
      attentionEconomics: 'Low cost',
      accessibility: 'WCAG AAA',
      trustBuilding: 'Standard patterns',
      semanticMeaning: 'Action trigger',
      usagePatterns: {
        dos: ['Use for primary actions'],
        nevers: ['Use without context'],
      },
    });
    expect(warnings).toEqual([]);
  });

  it('warns about each missing tag individually', () => {
    const warnings = validateComponentIntelligence('Skeleton', {
      cognitiveLoad: 1,
      // missing all other 5 tags
    });
    expect(warnings).toHaveLength(5);
    const messages = warnings.map((w) => w.message);
    expect(messages.some((m) => m.includes('@attentionEconomics'))).toBe(true);
    expect(messages.some((m) => m.includes('@accessibility'))).toBe(true);
    expect(messages.some((m) => m.includes('@trustBuilding'))).toBe(true);
    expect(messages.some((m) => m.includes('@semanticMeaning'))).toBe(true);
    expect(messages.some((m) => m.includes('@usagePatterns'))).toBe(true);
  });

  it('warns when usagePatterns exists but has zero DO: and NEVER: lines', () => {
    const warnings = validateComponentIntelligence('Widget', {
      cognitiveLoad: 3,
      attentionEconomics: 'Low',
      accessibility: 'Good',
      trustBuilding: 'Standard',
      semanticMeaning: 'Widget',
      usagePatterns: { dos: [], nevers: [] },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.level).toBe('empty');
    expect(warnings[0]?.message).toContain('zero DO: or NEVER:');
  });

  it('does not warn about usagePatterns when it has at least one DO:', () => {
    const warnings = validateComponentIntelligence('Button', {
      cognitiveLoad: 3,
      attentionEconomics: 'Low',
      accessibility: 'Good',
      trustBuilding: 'Standard',
      semanticMeaning: 'Action',
      usagePatterns: { dos: ['Use for actions'], nevers: [] },
    });
    expect(warnings).toEqual([]);
  });

  it('does not warn about usagePatterns when it has at least one NEVER:', () => {
    const warnings = validateComponentIntelligence('Badge', {
      cognitiveLoad: 2,
      attentionEconomics: 'Minimal',
      accessibility: 'Readable',
      trustBuilding: 'N/A',
      semanticMeaning: 'Status',
      usagePatterns: { dos: [], nevers: ['Use for interactive elements'] },
    });
    expect(warnings).toEqual([]);
  });

  it('returns both missing and empty warnings when applicable', () => {
    const warnings = validateComponentIntelligence('Broken', {
      cognitiveLoad: 5,
      usagePatterns: { dos: [], nevers: [] },
      // missing 4 tags + empty usagePatterns
    });
    const missingWarnings = warnings.filter((w) => w.level === 'missing');
    const emptyWarnings = warnings.filter((w) => w.level === 'empty');
    expect(missingWarnings.length).toBe(4);
    expect(emptyWarnings.length).toBe(1);
  });
});

describe('parseDescription', () => {
  it('returns undefined for source without JSDoc', () => {
    const source = `export function Button() {}`;
    expect(parseDescription(source)).toBeUndefined();
  });

  it('extracts description from JSDoc', () => {
    const source = `/**
 * A versatile button component for triggering actions.
 * @cognitive-load 3
 */
export function Button() {}`;
    expect(parseDescription(source)).toBe('A versatile button component for triggering actions.');
  });

  it('handles empty description', () => {
    const source = `/**
 * @cognitive-load 3
 */
export function Button() {}`;
    expect(parseDescription(source)).toBeUndefined();
  });
});

describe('extractVariants', () => {
  it('returns default for source without variants', () => {
    const source = `export function Button() {}`;
    expect(extractVariants(source)).toEqual(['default']);
  });

  it('extracts variants from type definition', () => {
    const source = `
interface ButtonProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';
}`;
    const variants = extractVariants(source);
    expect(variants).toContain('default');
    expect(variants).toContain('secondary');
    expect(variants).toContain('destructive');
    expect(variants).toContain('outline');
    expect(variants).toContain('ghost');
  });

  it('handles double-quoted variants', () => {
    const source = `variant?: "primary" | "secondary"`;
    const variants = extractVariants(source);
    expect(variants).toContain('primary');
    expect(variants).toContain('secondary');
  });
});

describe('extractSizes', () => {
  it('returns default for source without sizes', () => {
    const source = `export function Button() {}`;
    expect(extractSizes(source)).toEqual(['default']);
  });

  it('extracts sizes from type definition', () => {
    const source = `
interface ButtonProps {
  size?: 'sm' | 'default' | 'lg' | 'icon';
}`;
    const sizes = extractSizes(source);
    expect(sizes).toContain('sm');
    expect(sizes).toContain('default');
    expect(sizes).toContain('lg');
    expect(sizes).toContain('icon');
  });
});

describe('extractDependencies', () => {
  it('returns empty array for source without imports', () => {
    const source = `export function Button() {}`;
    expect(extractDependencies(source)).toEqual([]);
  });

  it('extracts external package imports', () => {
    const source = `
import React from 'react';
import { cn } from '@rafters/ui/utils';
import { Slot } from '@radix-ui/react-slot';
import './styles.css';
`;
    const deps = extractDependencies(source);
    expect(deps).toContain('react');
    expect(deps).toContain('@rafters/ui/utils');
    expect(deps).toContain('@radix-ui/react-slot');
    expect(deps).not.toContain('./styles.css');
  });

  it('excludes relative imports', () => {
    const source = `
import { helper } from './helper';
import { utils } from '../utils';
import React from 'react';
`;
    const deps = extractDependencies(source);
    expect(deps).toEqual(['react']);
  });

  it('deduplicates imports', () => {
    const source = `
import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';
`;
    const deps = extractDependencies(source);
    expect(deps).toEqual(['react']);
  });
});

describe('extractPrimitiveDependencies', () => {
  it('returns empty array for source without primitive imports', () => {
    const source = `
import React from 'react';
import { Button } from './button';
`;
    expect(extractPrimitiveDependencies(source)).toEqual([]);
  });

  it('extracts primitive imports from /primitives/ path', () => {
    const source = `
import { Dialog } from '@rafters/ui/primitives/dialog';
import { Popover } from '../primitives/popover';
`;
    const primitives = extractPrimitiveDependencies(source);
    expect(primitives).toContain('dialog');
    expect(primitives).toContain('popover');
  });

  it('includes types import from primitives', () => {
    const source = `
import { Dialog } from '../primitives/dialog';
import type { Props } from '../primitives/types';
`;
    const primitives = extractPrimitiveDependencies(source);
    expect(primitives).toContain('dialog');
    expect(primitives).toContain('types');
  });

  it('strips file extension from primitive name', () => {
    const source = `import { Dialog } from '../primitives/dialog.tsx';`;
    const primitives = extractPrimitiveDependencies(source);
    expect(primitives).toContain('dialog');
    expect(primitives).not.toContain('dialog.tsx');
  });
});

describe('extractJSDocDependencies', () => {
  const EMPTY_DEPS = { runtime: [], dev: [], internal: [] };

  it.each([
    ['source without JSDoc', `export function Button() {}`],
    ['JSDoc without dep tags', `/**\n * @cognitive-load 3/10\n */\nexport function Button() {}`],
  ])('returns empty arrays for %s', (_label, source) => {
    expect(extractJSDocDependencies(source)).toEqual(EMPTY_DEPS);
  });

  it('parses @dependencies with a single runtime dep', () => {
    const source = `/**
 * @dependencies nanostores@^0.11.0
 */
export function Handler() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.runtime).toEqual(['nanostores@^0.11.0']);
  });

  it('parses @dependencies with multiple runtime deps', () => {
    const source = `/**
 * @dependencies nanostores@^0.11.0 zustand@^4.0.0
 */
export function Handler() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.runtime).toEqual(['nanostores@^0.11.0', 'zustand@^4.0.0']);
  });

  it('parses @devDependencies when empty (tag present, no value)', () => {
    const source = `/**
 * @devDependencies
 */
export function Handler() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.dev).toEqual([]);
  });

  it('parses @devDependencies with values', () => {
    const source = `/**
 * @devDependencies vitest@^1.0.0 @testing-library/react@^14.0.0
 */
export function Handler() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.dev).toEqual(['vitest@^1.0.0', '@testing-library/react@^14.0.0']);
  });

  it('parses @internal-dependencies', () => {
    const source = `/**
 * @internal-dependencies @rafters/color-utils
 */
export function Picker() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.internal).toEqual(['@rafters/color-utils']);
  });

  it('parses all three tags together', () => {
    const source = `/**
 * Color picker composition primitive
 *
 * @dependencies nanostores@^0.11.0
 * @devDependencies
 * @internal-dependencies @rafters/color-utils
 */
export function Picker() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.runtime).toEqual(['nanostores@^0.11.0']);
    expect(result.dev).toEqual([]);
    expect(result.internal).toEqual(['@rafters/color-utils']);
  });

  it('stops parsing at parenthetical descriptions', () => {
    const source = `/**
 * @dependencies primitives/history (via consumer-provided getHistory callback)
 */
export function Handler() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.runtime).toEqual(['primitives/history']);
  });

  it('extracts multiple deps before parenthetical', () => {
    const source = `/**
 * @dependencies nanostores @nanostores/react (required for React bindings)
 */
export function Handler() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.runtime).toEqual(['nanostores', '@nanostores/react']);
  });

  it('parses multiple internal dependencies', () => {
    const source = `/**
 * @internal-dependencies @rafters/color-utils @rafters/math-utils
 */
export function Complex() {}`;
    const result = extractJSDocDependencies(source);
    expect(result.internal).toEqual(['@rafters/color-utils', '@rafters/math-utils']);
  });
});

describe('toDisplayName', () => {
  it('converts kebab-case to Title Case', () => {
    expect(toDisplayName('alert-dialog')).toBe('Alert Dialog');
    expect(toDisplayName('button')).toBe('Button');
    expect(toDisplayName('navigation-menu')).toBe('Navigation Menu');
    expect(toDisplayName('input-otp')).toBe('Input Otp');
  });

  it('handles single word', () => {
    expect(toDisplayName('button')).toBe('Button');
  });

  it('handles multiple hyphens', () => {
    expect(toDisplayName('my-custom-component')).toBe('My Custom Component');
  });
});
