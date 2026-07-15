/**
 * Unit tests for createRadioGroup - the framework-free behavior controller.
 *
 * Mirrors selection-group.test.ts: drives a real (happy-dom) DOM root with
 * [role="radio"][data-value] buttons and asserts single-select (non-collapsible)
 * semantics, ARIA / data-state reflection, onChange firing on user interaction
 * only, and that setValue is a silent programmatic write.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createRadioGroup } from './radio-group.controller';

function mountRadioGroup(values: string[]): HTMLElement {
  const root = document.createElement('div');
  root.setAttribute('role', 'radiogroup');
  for (const value of values) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.setAttribute('data-value', value);
    const indicator = document.createElement('span');
    indicator.setAttribute('data-radio-indicator', '');
    button.appendChild(indicator);
    root.appendChild(button);
  }
  document.body.appendChild(root);
  return root;
}

function radioFor(root: HTMLElement, value: string): HTMLButtonElement {
  const button = root.querySelector<HTMLButtonElement>(`[data-value="${value}"]`);
  if (!button) throw new Error(`no radio for ${value}`);
  return button;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('createRadioGroup', () => {
  it('re-selecting a radio does NOT deselect it', () => {
    const r = createRadioGroup(mountRadioGroup(['x', 'y']), { initial: 'x' });
    r.group.toggle('x');
    expect(r.group.get()).toEqual(['x']);
  });

  it('select switches the active value', () => {
    const r = createRadioGroup(mountRadioGroup(['x', 'y']), { initial: 'x' });
    r.group.select('y');
    expect(r.group.get()).toEqual(['y']);
  });

  it('reflects aria-checked and data-state on items', () => {
    const root = mountRadioGroup(['x', 'y']);
    const r = createRadioGroup(root, { initial: 'x' });
    expect(radioFor(root, 'x').getAttribute('aria-checked')).toBe('true');
    expect(radioFor(root, 'x').getAttribute('data-state')).toBe('checked');
    expect(radioFor(root, 'y').getAttribute('aria-checked')).toBe('false');
    expect(radioFor(root, 'y').getAttribute('data-state')).toBe('unchecked');
    r.group.select('y');
    expect(radioFor(root, 'x').getAttribute('data-state')).toBe('unchecked');
    expect(radioFor(root, 'y').getAttribute('data-state')).toBe('checked');
  });

  it("treats a '' initial as nothing selected", () => {
    const r = createRadioGroup(mountRadioGroup(['x', 'y']), { initial: '' });
    expect(r.group.get()).toEqual([]);
  });

  describe('click + keyboard selection', () => {
    it('click selects and fires onChange', () => {
      const root = mountRadioGroup(['x', 'y']);
      const seen: string[] = [];
      createRadioGroup(root, { onChange: (v) => seen.push(v) });
      radioFor(root, 'y').click();
      expect(seen).toEqual(['y']);
    });

    it('Space selects the focused radio', () => {
      const root = mountRadioGroup(['x', 'y']);
      const r = createRadioGroup(root);
      const y = radioFor(root, 'y');
      y.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(r.group.get()).toEqual(['y']);
    });

    it('Enter selects the focused radio', () => {
      const root = mountRadioGroup(['x', 'y']);
      const r = createRadioGroup(root);
      const x = radioFor(root, 'x');
      x.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(r.group.get()).toEqual(['x']);
    });

    it('ignores clicks on disabled radios', () => {
      const root = mountRadioGroup(['x']);
      radioFor(root, 'x').disabled = true;
      const r = createRadioGroup(root);
      radioFor(root, 'x').click();
      expect(r.group.get()).toEqual([]);
    });
  });

  describe('setValue (programmatic)', () => {
    it('does not fire onChange', () => {
      const root = mountRadioGroup(['x', 'y']);
      const seen: string[] = [];
      const r = createRadioGroup(root, { onChange: (v) => seen.push(v) });
      r.setValue('y');
      expect(r.group.get()).toEqual(['y']);
      expect(seen).toEqual([]);
    });

    it('clears with an empty string', () => {
      const root = mountRadioGroup(['x', 'y']);
      const r = createRadioGroup(root, { initial: 'x' });
      r.setValue('');
      expect(r.group.get()).toEqual([]);
    });
  });

  describe('destroy', () => {
    it('stops reflecting after teardown', () => {
      const root = mountRadioGroup(['x']);
      const r = createRadioGroup(root);
      r.destroy();
      radioFor(root, 'x').click();
      expect(r.group.get()).toEqual([]);
    });
  });
});
