/**
 * Unit tests for createToggleGroup - the framework-free behavior controller.
 *
 * Mirrors selection-group.test.ts: drives a real (happy-dom) DOM root with
 * [data-roving-item][data-value] buttons and asserts selection state, ARIA /
 * data-state reflection, onChange firing on user interaction only, and that
 * setValue is a silent programmatic write.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createToggleGroup } from './toggle-group.controller';

function mountToggleGroup(values: string[]): HTMLElement {
  const root = document.createElement('div');
  root.setAttribute('role', 'group');
  for (const value of values) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('data-roving-item', '');
    button.setAttribute('data-value', value);
    root.appendChild(button);
  }
  document.body.appendChild(root);
  return root;
}

function buttonFor(root: HTMLElement, value: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
  if (!button) throw new Error(`no button for ${value}`);
  return button;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('createToggleGroup', () => {
  describe('multiple mode', () => {
    it('toggles items independently', () => {
      const root = mountToggleGroup(['bold', 'italic', 'underline']);
      const c = createToggleGroup(root, { type: 'multiple' });
      c.group.toggle('bold');
      c.group.toggle('italic');
      expect(c.group.get()).toEqual(['bold', 'italic']);
      c.group.toggle('bold');
      expect(c.group.get()).toEqual(['italic']);
    });

    it('reflects aria-pressed and data-state on items', () => {
      const root = mountToggleGroup(['bold', 'italic']);
      const c = createToggleGroup(root, { type: 'multiple' });
      c.group.toggle('bold');
      const bold = buttonFor(root, 'bold');
      const italic = buttonFor(root, 'italic');
      expect(bold.getAttribute('aria-pressed')).toBe('true');
      expect(bold.getAttribute('data-state')).toBe('on');
      expect(italic.getAttribute('aria-pressed')).toBe('false');
      expect(italic.getAttribute('data-state')).toBe('off');
    });

    it('honors a string[] initial', () => {
      const root = mountToggleGroup(['a', 'b', 'c']);
      const c = createToggleGroup(root, { type: 'multiple', initial: ['a', 'c'] });
      expect(c.group.get()).toEqual(['a', 'c']);
      expect(buttonFor(root, 'a').getAttribute('data-state')).toBe('on');
      expect(buttonFor(root, 'b').getAttribute('data-state')).toBe('off');
    });
  });

  describe('single mode (collapsible)', () => {
    it('toggling the active value off clears the selection', () => {
      const single = createToggleGroup(mountToggleGroup(['a', 'b']), { type: 'single' });
      single.group.toggle('a');
      single.group.toggle('a');
      expect(single.group.get()).toEqual([]);
    });

    it('swaps selection between items', () => {
      const single = createToggleGroup(mountToggleGroup(['a', 'b']), { type: 'single' });
      single.group.toggle('a');
      single.group.toggle('b');
      expect(single.group.get()).toEqual(['b']);
    });

    it("treats a '' initial as nothing selected", () => {
      const c = createToggleGroup(mountToggleGroup(['a', 'b']), { type: 'single', initial: '' });
      expect(c.group.get()).toEqual([]);
    });

    it('honors a string initial', () => {
      const c = createToggleGroup(mountToggleGroup(['a', 'b']), { type: 'single', initial: 'b' });
      expect(c.group.get()).toEqual(['b']);
    });
  });

  describe('click activation + onChange', () => {
    it('fires onChange with a string in single mode on click', () => {
      const root = mountToggleGroup(['a', 'b']);
      const seen: Array<string | string[]> = [];
      createToggleGroup(root, { type: 'single', onChange: (v) => seen.push(v) });
      buttonFor(root, 'a').click();
      expect(seen).toEqual(['a']);
      buttonFor(root, 'a').click();
      expect(seen).toEqual(['a', '']);
    });

    it('fires onChange with a string[] in multiple mode on click', () => {
      const root = mountToggleGroup(['a', 'b']);
      const seen: Array<string | string[]> = [];
      createToggleGroup(root, { type: 'multiple', onChange: (v) => seen.push(v) });
      buttonFor(root, 'a').click();
      buttonFor(root, 'b').click();
      expect(seen).toEqual([['a'], ['a', 'b']]);
    });

    it('ignores clicks on disabled items', () => {
      const root = mountToggleGroup(['a']);
      buttonFor(root, 'a').disabled = true;
      const c = createToggleGroup(root, { type: 'single' });
      buttonFor(root, 'a').click();
      expect(c.group.get()).toEqual([]);
    });
  });

  describe('setValue (programmatic)', () => {
    it('does not fire onChange', () => {
      const root = mountToggleGroup(['a', 'b']);
      const seen: Array<string | string[]> = [];
      const c = createToggleGroup(root, { type: 'multiple', onChange: (v) => seen.push(v) });
      c.setValue(['a', 'b']);
      expect(c.group.get()).toEqual(['a', 'b']);
      expect(seen).toEqual([]);
    });

    it('clamps to one value in single mode', () => {
      const root = mountToggleGroup(['a', 'b', 'c']);
      const c = createToggleGroup(root, { type: 'single' });
      c.setValue(['a', 'b', 'c']);
      expect(c.group.get()).toEqual(['a']);
    });
  });

  describe('destroy', () => {
    it('stops reflecting after teardown', () => {
      const root = mountToggleGroup(['a']);
      const c = createToggleGroup(root, { type: 'single' });
      c.destroy();
      buttonFor(root, 'a').click();
      expect(c.group.get()).toEqual([]);
    });
  });
});
