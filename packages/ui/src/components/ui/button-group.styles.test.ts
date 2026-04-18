import { describe, expect, it } from 'vitest';
import {
  buttonGroupBase,
  buttonGroupStylesheet,
  isButtonGroupOrientation,
} from './button-group.styles';

describe('buttonGroupBase', () => {
  it('horizontal uses inline-flex with row direction', () => {
    expect(buttonGroupBase.horizontal.display).toBe('inline-flex');
    expect(buttonGroupBase.horizontal['flex-direction']).toBe('row');
  });

  it('vertical uses inline-flex with column direction', () => {
    expect(buttonGroupBase.vertical.display).toBe('inline-flex');
    expect(buttonGroupBase.vertical['flex-direction']).toBe('column');
  });
});

describe('isButtonGroupOrientation', () => {
  it('accepts horizontal and vertical', () => {
    expect(isButtonGroupOrientation('horizontal')).toBe(true);
    expect(isButtonGroupOrientation('vertical')).toBe(true);
  });

  it('rejects unknown strings and non-string values', () => {
    expect(isButtonGroupOrientation('diagonal')).toBe(false);
    expect(isButtonGroupOrientation('')).toBe(false);
    expect(isButtonGroupOrientation(null)).toBe(false);
    expect(isButtonGroupOrientation(undefined)).toBe(false);
    expect(isButtonGroupOrientation(1)).toBe(false);
  });
});

describe('buttonGroupStylesheet host rule', () => {
  it('emits :host with flex-direction: row by default', () => {
    expect(buttonGroupStylesheet()).toMatch(/:host\s*\{[^}]*flex-direction:\s*row/);
  });

  it('emits :host with display: inline-flex by default', () => {
    expect(buttonGroupStylesheet()).toMatch(/:host\s*\{[^}]*display:\s*inline-flex/);
  });

  it('emits :host with flex-direction: column for vertical orientation', () => {
    expect(buttonGroupStylesheet({ orientation: 'vertical' })).toMatch(/flex-direction:\s*column/);
  });
});

describe('buttonGroupStylesheet connected-border rules', () => {
  it('emits ::slotted connected-border selectors for horizontal by default', () => {
    const css = buttonGroupStylesheet();
    expect(css).toMatch(/::slotted\(\*:first-child\)/);
    expect(css).toMatch(/::slotted\(\*:last-child\)/);
    expect(css).toMatch(/::slotted\(\*:not\(:first-child\):not\(:last-child\)\)/);
  });

  it('horizontal clears right radius on the first child', () => {
    const css = buttonGroupStylesheet({ orientation: 'horizontal' });
    expect(css).toMatch(/::slotted\(\*:first-child\)\s*\{[^}]*border-top-right-radius:\s*0/);
    expect(css).toMatch(/::slotted\(\*:first-child\)\s*\{[^}]*border-bottom-right-radius:\s*0/);
  });

  it('horizontal clears left radius on the last child', () => {
    const css = buttonGroupStylesheet({ orientation: 'horizontal' });
    expect(css).toMatch(/::slotted\(\*:last-child\)\s*\{[^}]*border-top-left-radius:\s*0/);
    expect(css).toMatch(/::slotted\(\*:last-child\)\s*\{[^}]*border-bottom-left-radius:\s*0/);
  });

  it('horizontal applies -1px left margin on non-first children', () => {
    const css = buttonGroupStylesheet({ orientation: 'horizontal' });
    expect(css).toMatch(/::slotted\(\*:not\(:first-child\)\)\s*\{[^}]*margin-left:\s*-1px/);
  });

  it('vertical clears bottom radius on the first child', () => {
    const css = buttonGroupStylesheet({ orientation: 'vertical' });
    expect(css).toMatch(/::slotted\(\*:first-child\)\s*\{[^}]*border-bottom-right-radius:\s*0/);
    expect(css).toMatch(/::slotted\(\*:first-child\)\s*\{[^}]*border-bottom-left-radius:\s*0/);
  });

  it('vertical clears top radius on the last child', () => {
    const css = buttonGroupStylesheet({ orientation: 'vertical' });
    expect(css).toMatch(/::slotted\(\*:last-child\)\s*\{[^}]*border-top-right-radius:\s*0/);
    expect(css).toMatch(/::slotted\(\*:last-child\)\s*\{[^}]*border-top-left-radius:\s*0/);
  });

  it('vertical applies -1px top margin on non-first children', () => {
    const css = buttonGroupStylesheet({ orientation: 'vertical' });
    expect(css).toMatch(/::slotted\(\*:not\(:first-child\)\)\s*\{[^}]*margin-top:\s*-1px/);
  });

  it('middle children clear all radii in either orientation', () => {
    const horizontal = buttonGroupStylesheet({ orientation: 'horizontal' });
    const vertical = buttonGroupStylesheet({ orientation: 'vertical' });
    expect(horizontal).toMatch(
      /::slotted\(\*:not\(:first-child\):not\(:last-child\)\)\s*\{[^}]*border-radius:\s*0/,
    );
    expect(vertical).toMatch(
      /::slotted\(\*:not\(:first-child\):not\(:last-child\)\)\s*\{[^}]*border-radius:\s*0/,
    );
  });
});

describe('buttonGroupStylesheet focus stacking', () => {
  it('emits focus stacking for slotted focus-visible', () => {
    expect(buttonGroupStylesheet()).toMatch(/::slotted\(\*:focus-visible\)/);
  });

  it('focus-visible raises z-index to 10', () => {
    expect(buttonGroupStylesheet()).toMatch(/::slotted\(\*:focus-visible\)\s*\{[^}]*z-index:\s*10/);
  });

  it('focus stacking is present in both orientations', () => {
    expect(buttonGroupStylesheet({ orientation: 'horizontal' })).toMatch(
      /::slotted\(\*:focus-visible\)/,
    );
    expect(buttonGroupStylesheet({ orientation: 'vertical' })).toMatch(
      /::slotted\(\*:focus-visible\)/,
    );
  });
});

describe('buttonGroupStylesheet fallback', () => {
  it('falls back to horizontal when orientation is unknown', () => {
    expect(() => buttonGroupStylesheet({ orientation: 'diagonal' as never })).not.toThrow();
    const css = buttonGroupStylesheet({ orientation: 'diagonal' as never });
    expect(css).toMatch(/flex-direction:\s*row/);
    expect(css).not.toMatch(/flex-direction:\s*column/);
  });

  it('falls back to horizontal when orientation is undefined', () => {
    const css = buttonGroupStylesheet({ orientation: undefined });
    expect(css).toMatch(/flex-direction:\s*row/);
  });
});

describe('buttonGroupStylesheet motion tokens', () => {
  it('never emits --duration-* tokens', () => {
    expect(buttonGroupStylesheet()).not.toMatch(/var\(--duration-/);
    expect(buttonGroupStylesheet({ orientation: 'vertical' })).not.toMatch(/var\(--duration-/);
  });

  it('never emits --ease-* tokens', () => {
    expect(buttonGroupStylesheet()).not.toMatch(/var\(--ease-/);
    expect(buttonGroupStylesheet({ orientation: 'vertical' })).not.toMatch(/var\(--ease-/);
  });
});

describe('buttonGroupStylesheet purity', () => {
  it('returns identical output for identical inputs', () => {
    const a = buttonGroupStylesheet({ orientation: 'horizontal' });
    const b = buttonGroupStylesheet({ orientation: 'horizontal' });
    expect(a).toBe(b);
  });

  it('differs between orientations', () => {
    const h = buttonGroupStylesheet({ orientation: 'horizontal' });
    const v = buttonGroupStylesheet({ orientation: 'vertical' });
    expect(h).not.toBe(v);
  });
});
