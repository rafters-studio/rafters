import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  toggle,
  wrapToggleIcons,
  type ToggleConfig,
} from '../../../src/components/toggle/toggle.behavior';

const base: ToggleConfig = { variant: 'default', size: 'default', toggle: true };
const ids = {
  root: 'r',
  label: 'r-label',
  spinner: 'r-spinner',
  startIcon: 'r-start',
  endIcon: 'r-end',
};

function ariaFor(config: Partial<ToggleConfig>) {
  const full = { ...base, ...config };
  return toggle.aria(toggle.initialState(full), full, ids);
}

describe('toggle aria projection', () => {
  it('off: aria-pressed false, data-state off, no busy/disabled aria', () => {
    expect(ariaFor({}).root).toEqual({
      'aria-busy': undefined,
      'aria-disabled': undefined,
      'aria-pressed': 'false',
      'data-state': 'off',
    });
  });

  it('on: defaultPressed seeds aria-pressed true and data-state on', () => {
    const aria = ariaFor({ defaultPressed: true });
    expect(aria.root?.['aria-pressed']).toBe('true');
    expect(aria.root?.['data-state']).toBe('on');
  });

  it('aria-pressed is ALWAYS projected (a toggle is always in toggle mode)', () => {
    expect(ariaFor({}).root?.['aria-pressed']).toBe('false');
    expect(ariaFor({ defaultPressed: true }).root?.['aria-pressed']).toBe('true');
  });

  it('data-state overrides the pressable idle/soft-disabled axis with on/off', () => {
    // Even a hard-disabled toggle reports its pressed axis as on/off, not idle.
    expect(ariaFor({ disabled: true }).root?.['data-state']).toBe('off');
    expect(ariaFor({ disabled: true, defaultPressed: true }).root?.['data-state']).toBe('on');
  });

  it('hard disabled: NO aria-disabled duplication', () => {
    expect(ariaFor({ disabled: true }).root?.['aria-disabled']).toBeUndefined();
  });
});

describe('toggle suppression (canDispatch reads config)', () => {
  const cases: Array<[Partial<ToggleConfig>, boolean]> = [
    [{}, true],
    [{ disabled: true }, false],
    [{ defaultPressed: true }, true],
  ];
  for (const [overrides, expected] of cases) {
    const config = { ...base, ...overrides };
    it(`press with ${JSON.stringify(overrides)} -> ${expected}`, () => {
      const state = toggle.initialState(config);
      expect(toggle.canDispatch(state, 'press', config)).toBe(expected);
    });
  }
});

describe('toggle actions', () => {
  it('press flips pressed off -> on -> off', () => {
    const { memory, dispatch } = createBehavior(toggle, base);
    expect(memory.get().pressed).toBe(false);
    expect(dispatch('press', base)).toBe(true);
    expect(memory.get().pressed).toBe(true);
    expect(dispatch('press', base)).toBe(true);
    expect(memory.get().pressed).toBe(false);
  });

  it('defaultPressed seeds the initial pressed state', () => {
    const config = { ...base, defaultPressed: true };
    const { memory } = createBehavior(toggle, config);
    expect(memory.get().pressed).toBe(true);
  });

  it('dispatch gates on the config it is CALLED with, not the mount config', () => {
    const { memory, dispatch } = createBehavior(toggle, base);
    const disabledConfig = { ...base, disabled: true };
    expect(dispatch('press', disabledConfig)).toBe(false);
    expect(memory.get().pressed).toBe(false);
  });
});

describe('toggle keymap', () => {
  const state = toggle.initialState(base);
  it('Enter and Space on root map to press', () => {
    expect(toggle.keymap({ key: 'Enter' }, state, 'root')).toBe('press');
    expect(toggle.keymap({ key: ' ' }, state, 'root')).toBe('press');
  });
  it('other keys and other parts are not claimed', () => {
    expect(toggle.keymap({ key: 'Escape' }, state, 'root')).toBeNull();
    expect(toggle.keymap({ key: 'Enter' }, state, 'label')).toBeNull();
  });
});

// A toggle is an instant state swap, never loading -- it composes no effect
// primitive at either boundary. The WC/Astro bind and the React controller both
// wire click -> press only; there is no runner and nothing to drive. So there is
// no effects data to assert here.

describe('toggle icon parts', () => {
  it('declares startIcon and endIcon as optional parts that project aria-hidden', () => {
    expect(toggle.parts.startIcon).toEqual({ optional: true });
    expect(toggle.parts.endIcon).toEqual({ optional: true });
    const aria = ariaFor({});
    expect(aria.startIcon).toEqual({ 'aria-hidden': 'true' });
    expect(aria.endIcon).toEqual({ 'aria-hidden': 'true' });
  });
});

describe('wrapToggleIcons', () => {
  function host(children: string): { host: HTMLElement; root: HTMLElement } {
    document.body.innerHTML = `<rafters-toggle><button data-part="root"><span data-part="label">Bold</span></button>${children}</rafters-toggle>`;
    const h = document.querySelector('rafters-toggle') as HTMLElement;
    return { host: h, root: h.querySelector('[data-part="root"]') as HTMLElement };
  }

  it('wraps slotted children in hidden wrappers in reading order', () => {
    const { host: h, root } = host('<svg slot="end-icon"></svg><svg slot="start-icon"></svg>');
    wrapToggleIcons(h, root);
    const order = [...root.children].map((el) => el.getAttribute('data-part'));
    expect(order).toEqual(['startIcon', 'label', 'endIcon']);
    const start = root.querySelector('[data-part="startIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(root.querySelector('[data-part="endIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-end',
    );
    expect(start?.querySelector('svg')?.hasAttribute('slot')).toBe(false);
  });

  it('adds no wrapper without a slotted child, and is idempotent', () => {
    const { host: h, root } = host('');
    wrapToggleIcons(h, root);
    expect(root.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(root.querySelector('[data-part="endIcon"]')).toBeNull();
    const again = host('<svg slot="start-icon"></svg>');
    wrapToggleIcons(again.host, again.root);
    wrapToggleIcons(again.host, again.root);
    expect(again.root.querySelectorAll('[data-part="startIcon"]').length).toBe(1);
  });
});
