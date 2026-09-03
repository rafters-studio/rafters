import { describe, expect, it } from 'vitest';
import {
  alertActionClasses,
  alertClasses,
  alertDescriptionClasses,
  alertTitleClasses,
} from '../../../src/components/alert/alert.classes';
import type { AlertVariant } from '../../../src/components/alert/alert.behavior';

function root(variant?: AlertVariant): string {
  return alertClasses({ variant }, {}).root;
}

/** `default` is an alias for the `primary` token triple -- same convention
 *  button uses -- so it is asserted against 'primary', not literally
 *  'default-subtle' (no such token exists). */
const SEVERITY_TOKEN_WORDS: Array<[AlertVariant, string]> = [
  ['default', 'primary'],
  ['primary', 'primary'],
  ['secondary', 'secondary'],
  ['destructive', 'destructive'],
  ['success', 'success'],
  ['warning', 'warning'],
  ['info', 'info'],
  ['accent', 'accent'],
];

describe('alert classes', () => {
  it('defaults to the default variant when none is given', () => {
    expect(root(undefined)).toBe(root('default'));
  });

  it('every severity pairs a subtle background with its OWN subtle foreground', () => {
    for (const [variant, token] of SEVERITY_TOKEN_WORDS) {
      const classes = root(variant);
      expect(classes, variant).toContain(`bg-${token}-subtle`);
      expect(classes, variant).toContain(`text-${token}-subtle-foreground`);
      expect(classes, variant).toContain(`border-${token}-border`);
      // Defect guard: never the solid foreground paired with the subtle fill.
      expect(classes, variant).not.toContain(`text-${token}-foreground`);
    }
  });

  it('muted has no subtle tier -- flat muted/border pairing', () => {
    const classes = root('muted');
    expect(classes).toContain('bg-muted');
    expect(classes).toContain('text-muted-foreground');
    expect(classes).toContain('border-border');
  });

  it('base classes carry the icon-aware layout, never a raw arbitrary value', () => {
    const classes = root();
    expect(classes).toContain('relative w-full rounded-lg border p-4');
    expect(classes).not.toMatch(/\[[a-z0-9.]+px\]/);
  });

  // `alert / root / appear`: fade, tier `normal`, curve role `enter`, narrowed
  // to the fade alone on the operator's ruling (the row still reads
  // `fade + slide (y, small)` with a spacing-derived nudge). An alert has no
  // open/closed state, so the cell utility rides the root unconditionally.
  it('the root consumes the appear fade the matrix assigns', () => {
    expect(root()).toContain('animate-fade-in-normal-enter');
  });

  it('the appear motion names no literal timing, no slide, and no escape', () => {
    const classes = root();
    expect(classes).not.toMatch(/duration-\d/);
    expect(classes).not.toContain('motion-reduce:');
    expect(classes).not.toContain('slide');
    expect(classes).not.toContain('extent-');
  });

  it('title/description/action are config-independent literals', () => {
    expect(alertTitleClasses).toBe('mb-1 text-title-small ts-title-small leading-none');
    expect(alertDescriptionClasses).toBe('text-body-small ts-body-small [&_p]:leading-relaxed');
    expect(alertActionClasses).toBe('ml-auto shrink-0');
  });
});
