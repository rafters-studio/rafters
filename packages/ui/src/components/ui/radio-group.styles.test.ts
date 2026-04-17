/**
 * Unit tests for radio-group.styles.
 *
 * Focus areas:
 *  - Token hygiene (motion-* only, no bare var(--duration-*) or var(--ease-*))
 *  - Orientation fallback
 *  - Reduced-motion guard
 *  - No raw hex / rgb() literals
 *  - Indicator display toggles on checked
 *  - Disabled declarations appear
 */

import { describe, expect, it } from 'vitest';
import {
  type RadioOrientation,
  radioGroupBase,
  radioGroupStylesheet,
  radioItemBase,
  radioItemDisabled,
  radioItemFocusVisible,
  radioItemIndicator,
  radioItemStylesheet,
} from './radio-group.styles';

const ALL_ORIENTATIONS: ReadonlyArray<RadioOrientation> = ['horizontal', 'vertical'];

describe('radioGroupStylesheet', () => {
  it('uses --motion-duration-* not --duration-*', () => {
    const css = radioItemStylesheet();
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
    expect(css).toContain('var(--motion-duration-fast)');
  });

  it('uses --motion-ease-* not --ease-*', () => {
    const css = radioItemStylesheet();
    expect(css).toContain('var(--motion-ease-standard)');
  });

  it('emits vertical grid by default', () => {
    expect(radioGroupStylesheet()).toMatch(/display:\s*grid/);
  });

  it('emits horizontal flex when requested', () => {
    expect(radioGroupStylesheet({ orientation: 'horizontal' })).toMatch(/display:\s*flex/);
  });

  it('falls back to vertical on unknown orientation', () => {
    expect(() => radioGroupStylesheet({ orientation: 'diagonal' as never })).not.toThrow();
    expect(radioGroupStylesheet({ orientation: 'diagonal' as never })).toMatch(/display:\s*grid/);
  });

  it('emits all orientations without throwing', () => {
    for (const o of ALL_ORIENTATIONS) {
      expect(() => radioGroupStylesheet({ orientation: o })).not.toThrow();
    }
  });

  it('uses gap from spacing-2 token', () => {
    expect(radioGroupStylesheet()).toContain('var(--spacing-2)');
    expect(radioGroupStylesheet({ orientation: 'horizontal' })).toContain('var(--spacing-2)');
  });

  it('never emits a raw hex or rgb() literal', () => {
    const vertical = radioGroupStylesheet();
    const horizontal = radioGroupStylesheet({ orientation: 'horizontal' });
    expect(vertical).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(vertical).not.toMatch(/rgb\(/);
    expect(horizontal).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(horizontal).not.toMatch(/rgb\(/);
  });

  it('never emits a raw var() that is not a CSS custom property reference', () => {
    const css = radioGroupStylesheet({ orientation: 'horizontal' });
    const matches = css.match(/var\([^)]+\)/g) ?? [];
    for (const m of matches) {
      expect(m).toMatch(/var\(--/);
    }
  });

  it('exports radioGroupBase for both orientations', () => {
    expect(radioGroupBase.vertical).toMatchObject({ display: 'grid' });
    expect(radioGroupBase.horizontal).toMatchObject({ display: 'flex' });
  });
});

describe('radioItemStylesheet', () => {
  it('wraps transitions in prefers-reduced-motion', () => {
    expect(radioItemStylesheet()).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(radioItemStylesheet()).toContain('transition: none');
  });

  it('emits :host display: inline-flex', () => {
    expect(radioItemStylesheet()).toMatch(/:host\s*\{[^}]*display:\s*inline-flex/);
  });

  it('emits the .radio base rule with primary border color', () => {
    const css = radioItemStylesheet();
    expect(css).toContain('.radio');
    expect(css).toContain('var(--color-primary)');
    expect(css).toContain('border-width: 1px');
    expect(css).toContain('border-style: solid');
  });

  it('emits the focus-visible ring with background + ring tokens', () => {
    const css = radioItemStylesheet();
    expect(css).toContain('.radio:focus-visible');
    expect(css).toContain('var(--color-background)');
    expect(css).toContain('var(--color-ring)');
  });

  it('shows the indicator when checked', () => {
    const css = radioItemStylesheet({ checked: true });
    // The indicator rule carries display: block when checked.
    expect(css).toMatch(/\.indicator\s*\{[^}]*display:\s*block/);
  });

  it('hides the indicator when unchecked', () => {
    const css = radioItemStylesheet({ checked: false });
    expect(css).toMatch(/\.indicator\s*\{[^}]*display:\s*none/);
  });

  it('emits a disabled rule that carries disabled declarations', () => {
    const css = radioItemStylesheet({ disabled: true });
    expect(css).toContain('.radio:disabled');
    expect(css).toContain('opacity: 0.5');
    expect(css).toContain('cursor: not-allowed');
  });

  it('emits the indicator size (0.5rem square)', () => {
    const css = radioItemStylesheet({ checked: true });
    expect(css).toContain('height: 0.5rem');
    expect(css).toContain('width: 0.5rem');
  });

  it('emits aspect-ratio: 1 and fixed square dimensions', () => {
    const css = radioItemStylesheet();
    expect(css).toContain('aspect-ratio: 1');
    expect(css).toContain('height: 1rem');
    expect(css).toContain('width: 1rem');
  });

  it('never emits a raw hex or rgb() literal', () => {
    const css = radioItemStylesheet({ checked: true, disabled: true });
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i);
    expect(css).not.toMatch(/rgb\(/);
  });

  it('never emits a raw var() that is not a CSS custom property reference', () => {
    const css = radioItemStylesheet({ checked: true });
    const matches = css.match(/var\([^)]+\)/g) ?? [];
    for (const m of matches) {
      expect(m).toMatch(/var\(--/);
    }
  });

  it('exports radioItemBase with inline-flex and cursor: pointer', () => {
    expect(radioItemBase).toMatchObject({
      display: 'inline-flex',
      'align-items': 'center',
      'justify-content': 'center',
      cursor: 'pointer',
    });
  });

  it('exports radioItemFocusVisible with outline: none', () => {
    expect(radioItemFocusVisible).toMatchObject({ outline: 'none' });
  });

  it('exports radioItemDisabled with opacity and cursor', () => {
    expect(radioItemDisabled).toMatchObject({
      cursor: 'not-allowed',
      opacity: '0.5',
    });
  });

  it('exports radioItemIndicator with background-color: currentColor', () => {
    expect(radioItemIndicator).toMatchObject({
      'background-color': 'currentColor',
    });
  });
});
