import { describe, expect, it } from 'vitest';
import {
  frameworkToTarget,
  isSelectableFramework,
  SELECTABLE_FRAMEWORKS,
  targetToExtension,
} from '../../src/utils/detect.js';

describe('SELECTABLE_FRAMEWORKS', () => {
  it('includes every framework an agent can pick (no unknown)', () => {
    expect(SELECTABLE_FRAMEWORKS).toEqual([
      'next',
      'vite',
      'remix',
      'react-router',
      'astro',
      'preact',
      'vanilla',
    ]);
    expect(SELECTABLE_FRAMEWORKS).not.toContain('unknown');
  });
});

describe('isSelectableFramework', () => {
  it('accepts every valid framework name', () => {
    for (const f of SELECTABLE_FRAMEWORKS) {
      expect(isSelectableFramework(f)).toBe(true);
    }
  });

  it('rejects unknown, empty, arbitrary strings', () => {
    expect(isSelectableFramework('unknown')).toBe(false);
    expect(isSelectableFramework('')).toBe(false);
    expect(isSelectableFramework('qwik')).toBe(false);
    expect(isSelectableFramework('react')).toBe(false); // only frameworks, not targets
  });
});

describe('frameworkToTarget', () => {
  it('maps react-based frameworks to react', () => {
    expect(frameworkToTarget('next')).toBe('react');
    expect(frameworkToTarget('vite')).toBe('react');
    expect(frameworkToTarget('remix')).toBe('react');
    expect(frameworkToTarget('react-router')).toBe('react');
  });

  it('maps astro to astro', () => {
    expect(frameworkToTarget('astro')).toBe('astro');
  });

  it('maps vanilla and unknown to react (shadcn drop-in default)', () => {
    expect(frameworkToTarget('vanilla')).toBe('react');
    expect(frameworkToTarget('unknown')).toBe('react');
  });
});

describe('targetToExtension', () => {
  it('maps each target to its source extension', () => {
    expect(targetToExtension('react')).toBe('.tsx');
    expect(targetToExtension('astro')).toBe('.astro');
    expect(targetToExtension('vue')).toBe('.vue');
    expect(targetToExtension('svelte')).toBe('.svelte');
  });
});
