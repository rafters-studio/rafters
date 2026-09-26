/**
 * WC performance of the toggle score, driven end to end against light-DOM
 * markup. The Web Component is a light-DOM enhancer: the author provides a
 * real inner <button data-part="root"> so native Enter/Space activation
 * survives, and RaftersToggle hands the root to bindToggle -- the SAME
 * controller the React binding composes.
 */
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { toggle, type ToggleConfig } from '../../../src/components/toggle/toggle.behavior';
import { toggleClasses } from '../../../src/components/toggle/toggle.classes';
import { RaftersToggle } from '../../../src/components/toggle/toggle.element';

beforeAll(() => {
  if (!customElements.get('rafters-toggle')) customElements.define('rafters-toggle', RaftersToggle);
});

interface ScenarioProps {
  variant?: ToggleConfig['variant'];
  size?: ToggleConfig['size'];
  disabled?: boolean;
  pressed?: boolean;
  ariaLabel?: string;
}

interface Scenario {
  name: string;
  props: ScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'off default', props: {} },
  { name: 'on (pressed)', props: { pressed: true } },
  { name: 'outline variant', props: { variant: 'outline' } },
  { name: 'large size on', props: { size: 'lg', pressed: true } },
  { name: 'hard disabled', props: { disabled: true } },
  { name: 'icon-only with accessible name', props: { ariaLabel: 'Bold' } },
];

function configFor(props: ScenarioProps): ToggleConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    toggle: true,
    disabled: props.disabled ?? false,
    defaultPressed: props.pressed ?? false,
  };
}

/** Apply a resolved aria projection to an element (undefined = absent). */
function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
}

async function mount(props: ScenarioProps, label: string): Promise<HTMLElement> {
  const config = configFor(props);
  const state = toggle.initialState(config);
  const ids = { root: 'wc-root', label: 'wc-label' };
  const aria = toggle.aria(state, config, ids);
  const classes = toggleClasses(config, state);

  const hostEl = document.createElement('rafters-toggle');

  const rootEl = document.createElement('button');
  rootEl.type = 'button';
  rootEl.dataset['part'] = 'root';
  rootEl.id = ids.root;
  rootEl.className = classes.root;
  if (props.disabled) rootEl.disabled = true;
  if (props.ariaLabel !== undefined) rootEl.setAttribute('aria-label', props.ariaLabel);
  if (aria.root) applyAria(rootEl, aria.root);

  const labelEl = document.createElement('span');
  labelEl.dataset['part'] = 'label';
  labelEl.id = ids.label;
  labelEl.textContent = label;
  rootEl.appendChild(labelEl);

  hostEl.appendChild(rootEl);
  document.body.appendChild(hostEl);
  // connectedCallback defers the bind one microtask (upgrade order); wait for it.
  await Promise.resolve();
  return rootEl;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('toggle [wc]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
      const rootEl = await mount(scenario.props, 'Bold');
      const config = configFor(scenario.props);
      const state = toggle.initialState(config);
      const label = rootEl.querySelector<HTMLElement>('[data-part="label"]');

      expect(label, 'declared part "label" must be rendered').not.toBeNull();

      const ids = { root: rootEl.id, label: label?.id ?? '' };
      const projection = toggle.aria(state, config, ids);
      // Only root/label: `spinner` is pressable's optional part (parts.ts:27,
      // 'spinner': { optional: true }) and Toggle's React/WC/Astro decorators
      // never render a data-part="spinner" element (confirmed by inspection --
      // no lane emits one), so its unconditional aria-hidden projection has no
      // DOM node to land on. Asserting it here would be a false failure, not a
      // dropped check: the former harness's EXPECTED_PARTS made the
      // same exclusion.
      for (const part of ['root', 'label'] as const) {
        const attrs = projection[part];
        if (!attrs) continue;
        const el = part === 'root' ? rootEl : label;
        for (const [attr, value] of Object.entries(attrs)) {
          if (value === undefined) {
            expect(el?.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
          } else {
            expect(el?.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
          }
        }
      }
    });
  }

  it('Enter and Space flip aria-pressed and data-state through the keymap', async () => {
    const rootEl = await mount({}, 'Bold');
    expect(rootEl.getAttribute('aria-pressed')).toBe('false');
    expect(rootEl.getAttribute('data-state')).toBe('off');
    const user = userEvent.setup();
    rootEl.focus();
    await user.keyboard('{Enter}');
    expect(rootEl.getAttribute('aria-pressed')).toBe('true');
    expect(rootEl.getAttribute('data-state')).toBe('on');
    await user.keyboard(' ');
    expect(rootEl.getAttribute('aria-pressed')).toBe('false');
    expect(rootEl.getAttribute('data-state')).toBe('off');
  });

  it('hard disabled: native disabled only, no aria-disabled, press suppressed', async () => {
    const rootEl = await mount({ disabled: true }, 'Bold');
    expect(rootEl.hasAttribute('disabled')).toBe(true);
    expect(rootEl.hasAttribute('aria-disabled')).toBe(false);
    const user = userEvent.setup();
    await user.click(rootEl);
    expect(rootEl.getAttribute('aria-pressed')).toBe('false');
  });
});
