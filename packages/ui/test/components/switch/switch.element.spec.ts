/**
 * WC render + performance of the switch score, driven end to end.
 *
 * The Web Component is a light-DOM enhancer: the author provides a real inner
 * <button role="switch" data-part="root"> so native Enter/Space activation
 * survives. This test server-renders that markup with the score's initial
 * projection already applied -- exactly what Astro emits -- then lets
 * RaftersSwitch hand the root to bindSwitch (the SAME controller the React
 * binding composes). The accessible name is aria-label on the inner button
 * (light DOM, so it is expressible).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { switchBehavior, type SwitchConfig } from '../../../src/components/switch/switch.behavior';
import { switchClasses } from '../../../src/components/switch/switch.classes';
import { RaftersSwitch } from '../../../src/components/switch/switch.element';

interface ScenarioProps {
  variant?: SwitchConfig['variant'];
  size?: SwitchConfig['size'];
  checked?: boolean;
  disabled?: boolean;
  required?: boolean;
}

interface Scenario {
  name: string;
  props: ScenarioProps;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'unchecked default', props: {} },
  { name: 'checked', props: { checked: true } },
  { name: 'destructive lg checked', props: { variant: 'destructive', size: 'lg', checked: true } },
  { name: 'small', props: { size: 'sm' } },
  { name: 'required unchecked', props: { required: true } },
  { name: 'disabled', props: { disabled: true } },
];

const EXPECTED_PARTS = ['root', 'thumb'] as const;

function configFor(props: ScenarioProps): SwitchConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    defaultChecked: props.checked ?? false,
    disabled: props.disabled ?? false,
    required: props.required ?? false,
  };
}

function applyAria(
  element: HTMLElement,
  attrs: Record<string, string | boolean | undefined>,
): void {
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    element.setAttribute(name, String(value));
  }
}

function partElement(root: HTMLElement, part: string): HTMLElement | null {
  if (root.getAttribute('data-part') === part) return root;
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

beforeAll(() => {
  if (!customElements.get('rafters-switch')) customElements.define('rafters-switch', RaftersSwitch);
});

async function mount(props: ScenarioProps, label: string): Promise<HTMLElement> {
  const config = configFor(props);
  const state = switchBehavior.initialState(config);
  const ids = { root: 'wc-root', thumb: 'wc-thumb' };
  const aria = switchBehavior.aria(state, config, ids);
  const classes = switchClasses(config, state);

  const hostEl = document.createElement('rafters-switch');

  const root = document.createElement('button');
  root.type = 'button';
  root.setAttribute('role', 'switch');
  root.dataset['part'] = 'root';
  root.id = ids.root;
  root.className = classes.root;
  root.setAttribute('aria-label', label);
  if (props.disabled) root.disabled = true;
  if (aria.root) applyAria(root, aria.root);

  const thumb = document.createElement('span');
  thumb.dataset['part'] = 'thumb';
  thumb.id = ids.thumb;
  thumb.className = classes.thumb;
  if (aria.thumb) applyAria(thumb, aria.thumb);
  root.appendChild(thumb);

  hostEl.appendChild(root);
  document.body.appendChild(hostEl);
  // connectedCallback defers the bind one microtask (upgrade order); wait for it.
  await Promise.resolve();
  return root;
}

describe('switch [wc]', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
      const root = await mount(scenario.props, 'Enable notifications');
      try {
        const config = configFor(scenario.props);
        const state = switchBehavior.initialState(config);
        const ids = { root: root.id, thumb: partElement(root, 'thumb')?.id ?? '' };
        const projection = switchBehavior.aria(state, config, ids);
        for (const part of EXPECTED_PARTS) {
          const element = partElement(root, part);
          expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
          const decl = switchBehavior.parts[part];
          if (decl.role) {
            expect(element?.getAttribute('role'), `part "${part}" role`).toBe(decl.role);
          }
          const attrs = projection[part];
          if (!attrs || !element) continue;
          for (const [attr, value] of Object.entries(attrs)) {
            if (value === undefined) {
              expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(
                false,
              );
            } else {
              expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
            }
          }
        }
      } finally {
        root.closest('rafters-switch')?.remove();
      }
    });
  }

  it('click toggles aria-checked and the data-state on root and thumb', async () => {
    const root = await mount({}, 'Wi-Fi');
    try {
      const thumb = partElement(root, 'thumb');
      expect(root.getAttribute('aria-checked')).toBe('false');
      expect(root.getAttribute('data-state')).toBe('unchecked');
      expect(thumb?.getAttribute('data-state')).toBe('unchecked');

      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('true');
      expect(root.getAttribute('data-state')).toBe('checked');
      expect(thumb?.getAttribute('data-state')).toBe('checked');

      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('false');
      expect(thumb?.getAttribute('data-state')).toBe('unchecked');
    } finally {
      root.closest('rafters-switch')?.remove();
    }
  });

  it('Space and Enter flip aria-checked (native activation)', async () => {
    const root = await mount({}, 'Bluetooth');
    try {
      expect(root.getAttribute('aria-checked')).toBe('false');
      const user = userEvent.setup();
      root.focus();
      await user.keyboard(' ');
      expect(root.getAttribute('aria-checked')).toBe('true');
      await user.keyboard('{Enter}');
      expect(root.getAttribute('aria-checked')).toBe('false');
    } finally {
      root.closest('rafters-switch')?.remove();
    }
  });

  it('disabled: native disabled only, no aria-disabled, click does not toggle', async () => {
    const root = await mount({ disabled: true }, 'Airplane mode');
    try {
      expect(root.hasAttribute('disabled')).toBe(true);
      expect(root.hasAttribute('aria-disabled')).toBe(false);
      const user = userEvent.setup();
      await user.click(root);
      expect(root.getAttribute('aria-checked')).toBe('false');
    } finally {
      root.closest('rafters-switch')?.remove();
    }
  });
});
