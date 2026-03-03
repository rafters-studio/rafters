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

  it('excludes types import from primitives', () => {
    const source = `
import { Dialog } from '../primitives/dialog';
import type { Props } from '../primitives/types';
`;
    const primitives = extractPrimitiveDependencies(source);
    expect(primitives).toContain('dialog');
    expect(primitives).not.toContain('types');
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
