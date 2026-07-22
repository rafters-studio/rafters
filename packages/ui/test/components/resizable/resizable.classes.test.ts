import { describe, expect, it } from 'vitest';
import {
  resizableBehavior,
  type ResizableConfig,
} from '../../../src/components/resizable/resizable.behavior';
import { resizableClasses } from '../../../src/components/resizable/resizable.classes';

const base: ResizableConfig = {
  direction: 'horizontal',
  panels: [
    { defaultSize: 50, minSize: 10, maxSize: 90 },
    { defaultSize: 50, minSize: 10, maxSize: 90 },
  ],
  disabled: false,
};

function classesFor(config: ResizableConfig) {
  return resizableClasses(config, resizableBehavior.initialState(config));
}

describe('resizable classes', () => {
  it('root is a flex container that follows the horizontal axis', () => {
    const { root } = classesFor(base);
    expect(root).toContain('flex');
    expect(root).toContain('h-full');
    expect(root).toContain('w-full');
    expect(root).toContain('flex-row');
  });

  it('vertical root stacks the column', () => {
    expect(classesFor({ ...base, direction: 'vertical' }).root).toContain('flex-col');
  });

  it('panel is a fixed-basis, clipped cell', () => {
    const { panel } = classesFor(base);
    expect(panel).toContain('grow-0');
    expect(panel).toContain('shrink-0');
    expect(panel).toContain('overflow-hidden');
  });

  it('handle carries the border rail, focus ring, and data-driven state styling', () => {
    const { handle } = classesFor(base);
    expect(handle).toContain('bg-border');
    expect(handle).toContain('focus-visible:ring-ring');
    expect(handle).toContain('data-[dragging]:bg-primary');
    expect(handle).toContain('data-[disabled]:opacity-50');
    expect(handle).toContain('cursor-col-resize');
  });

  it('vertical handle uses the row-resize cursor and horizontal rail', () => {
    const { handle } = classesFor({ ...base, direction: 'vertical' });
    expect(handle).toContain('cursor-row-resize');
    expect(handle).toContain('h-px');
  });

  it('declares no raw duration or easing literal (motion undeclared)', () => {
    const { handle, root, panel } = classesFor(base);
    for (const cls of [handle, root, panel]) {
      expect(cls).not.toMatch(/duration-\d/);
      expect(cls).not.toMatch(/duration-\[/);
      expect(cls).not.toMatch(/ease-\[/);
    }
  });

  it('grip icon rotates only in the horizontal axis', () => {
    expect(classesFor(base).gripIcon).toContain('rotate-90');
    expect(classesFor({ ...base, direction: 'vertical' }).gripIcon).not.toContain('rotate-90');
  });
});
