import { describe, expect, it } from 'vitest';
import { buttonGroupClasses } from '../../../src/components/button-group/button-group.classes';
import type { ButtonGroupOrientation } from '../../../src/components/button-group/button-group.behavior';

function root(orientation: ButtonGroupOrientation): string {
  return buttonGroupClasses({ orientation }, {}).root;
}

describe('button-group classes', () => {
  it('is an inline flex container in both orientations', () => {
    expect(root('horizontal')).toContain('inline-flex');
    expect(root('vertical')).toContain('inline-flex');
  });

  it('orientation drives flex-direction', () => {
    expect(root('horizontal')).toContain('flex-row');
    expect(root('horizontal')).not.toContain('flex-col');
    expect(root('vertical')).toContain('flex-col');
    expect(root('vertical')).not.toContain('flex-row');
  });

  it('horizontal collapses left/right radii and the shared vertical border', () => {
    const h = root('horizontal');
    expect(h).toContain('[&>*:first-child]:rounded-r-none');
    expect(h).toContain('[&>*:last-child]:rounded-l-none');
    expect(h).toContain('[&>*:not(:first-child):not(:last-child)]:rounded-none');
    expect(h).toContain('[&>*:not(:first-child)]:-ml-px');
  });

  it('vertical collapses top/bottom radii and the shared horizontal border', () => {
    const v = root('vertical');
    expect(v).toContain('[&>*:first-child]:rounded-b-none');
    expect(v).toContain('[&>*:last-child]:rounded-t-none');
    expect(v).toContain('[&>*:not(:first-child):not(:last-child)]:rounded-none');
    expect(v).toContain('[&>*:not(:first-child)]:-mt-px');
  });

  it('raises the focus-visible child so the single ring is never clipped', () => {
    expect(root('horizontal')).toContain('[&>*:focus-visible]:z-10');
    expect(root('vertical')).toContain('[&>*:focus-visible]:z-10');
  });
});
