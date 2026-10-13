import { describe, expect, it } from 'vitest';
import { createBehavior } from '../../../src/lib/contract';
import {
  button,
  wrapButtonIcons,
  type ButtonConfig,
} from '../../../src/components/button/button.behavior';

const base: ButtonConfig = { variant: 'default', size: 'default' };
const ids = {
  root: 'r',
  label: 'r-label',
  spinner: 'r-spinner',
  startIcon: 'r-start',
  endIcon: 'r-end',
};

function ariaFor(config: Partial<ButtonConfig>) {
  const full = { ...base, ...config };
  return button.aria(button.initialState(full), full, ids);
}

describe('button aria projection', () => {
  it('idle: no busy, no aria-disabled, no aria-pressed', () => {
    expect(ariaFor({}).root).toEqual({
      'aria-busy': undefined,
      'aria-disabled': undefined,
      'aria-pressed': undefined,
      'data-state': 'idle',
    });
  });

  it('loading: aria-busy, spinner hidden, state=loading', () => {
    const aria = ariaFor({ loading: true });
    expect(aria.root?.['aria-busy']).toBe('true');
    expect(aria.root?.['data-state']).toBe('loading');
    expect(aria.spinner).toEqual({ 'aria-hidden': 'true' });
  });

  it('declares startIcon and endIcon as optional parts that project aria-hidden', () => {
    expect(button.parts.startIcon).toEqual({ optional: true });
    expect(button.parts.endIcon).toEqual({ optional: true });
    const aria = ariaFor({});
    expect(aria.startIcon).toEqual({ 'aria-hidden': 'true' });
    expect(aria.endIcon).toEqual({ 'aria-hidden': 'true' });
  });

  it('soft-disabled: aria-disabled without native disabled', () => {
    const aria = ariaFor({ softDisabled: true });
    expect(aria.root?.['aria-disabled']).toBe('true');
    expect(aria.root?.['data-state']).toBe('soft-disabled');
  });

  it('hard disabled: NO aria-disabled duplication', () => {
    expect(ariaFor({ disabled: true }).root?.['aria-disabled']).toBeUndefined();
  });

  it('toggle: aria-pressed tracks pressed state', () => {
    expect(ariaFor({ toggle: true }).root?.['aria-pressed']).toBe('false');
  });

  it('non-toggle: no aria-pressed', () => {
    expect(ariaFor({}).root?.['aria-pressed']).toBeUndefined();
  });
});

describe('button suppression (canDispatch reads config)', () => {
  const cases: Array<[Partial<ButtonConfig>, boolean]> = [
    [{}, true],
    [{ disabled: true }, false],
    [{ softDisabled: true }, false],
    [{ loading: true }, false],
    [{ disabled: true, loading: true }, false],
  ];
  for (const [overrides, expected] of cases) {
    const config = { ...base, ...overrides };
    it(`press with ${JSON.stringify(overrides)} -> ${expected}`, () => {
      const state = button.initialState(config);
      expect(button.canDispatch(state, 'press', config)).toBe(expected);
    });
  }
});

describe('button actions', () => {
  it('press flips pressed in toggle mode', () => {
    const config = { ...base, toggle: true };
    const { memory, dispatch } = createBehavior(button, config);
    expect(dispatch('press', config)).toBe(true);
    expect(memory.get().pressed).toBe(true);
    expect(dispatch('press', config)).toBe(true);
    expect(memory.get().pressed).toBe(false);
  });

  it('press is a no-op on pressed in non-toggle mode', () => {
    const { memory, dispatch } = createBehavior(button, base);
    dispatch('press', base);
    expect(memory.get().pressed).toBeUndefined();
  });

  it('defaultPressed seeds the initial toggle state', () => {
    const config = { ...base, toggle: true, defaultPressed: true };
    const { memory } = createBehavior(button, config);
    expect(memory.get().pressed).toBe(true);
  });

  it('dispatch gates on the config it is CALLED with, not the mount config', () => {
    const mountConfig = { ...base, toggle: true };
    const { memory, dispatch } = createBehavior(button, mountConfig);
    const laterConfig = { ...mountConfig, loading: true };
    expect(dispatch('press', laterConfig)).toBe(false);
    expect(memory.get().pressed).toBe(false);
  });
});

describe('button keymap', () => {
  const state = button.initialState(base);
  it('Enter and Space on root map to press', () => {
    expect(button.keymap({ key: 'Enter' }, state, 'root')).toBe('press');
    expect(button.keymap({ key: ' ' }, state, 'root')).toBe('press');
  });
  it('other keys and other parts are not claimed', () => {
    expect(button.keymap({ key: 'Escape' }, state, 'root')).toBeNull();
    expect(button.keymap({ key: 'Enter' }, state, 'label')).toBeNull();
  });
});

// The loading announcement is no longer a declarative effect on the score --
// the WC/Astro bind and the React controller each compose the sr-announcer
// primitive directly, edge-triggered. Its behavior (a mount that is already
// loading projects aria-busy but stays silent; a loading false->true transition
// announces the loading message once) is asserted end to end: baseline
// suppression in the former shared harness ('loading at mount ... announce
// suppressed') and the runtime transition in the React-only edge-triggered
// suite ('announces when loading transitions false -> true').

describe('wrapButtonIcons', () => {
  function host(children: string): { host: HTMLElement; root: HTMLElement } {
    document.body.innerHTML = `<rafters-button><button data-part="root"><span data-part="label">Send</span></button>${children}</rafters-button>`;
    const h = document.querySelector('rafters-button') as HTMLElement;
    return { host: h, root: h.querySelector('[data-part="root"]') as HTMLElement };
  }

  it('wraps slotted children in hidden wrappers in reading order', () => {
    const { host: h, root } = host('<svg slot="end-icon"></svg><svg slot="start-icon"></svg>');
    wrapButtonIcons(h, root);
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
    wrapButtonIcons(h, root);
    expect(root.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(root.querySelector('[data-part="endIcon"]')).toBeNull();
    const again = host('<svg slot="start-icon"></svg>');
    wrapButtonIcons(again.host, again.root);
    wrapButtonIcons(again.host, again.root);
    expect(again.root.querySelectorAll('[data-part="startIcon"]').length).toBe(1);
  });
});
