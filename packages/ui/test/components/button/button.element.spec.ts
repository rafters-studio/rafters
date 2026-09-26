/**
 * Browser-project performance of the Button score for the Web Component
 * target: real chromium through @vitest/browser-playwright. The element is a
 * light-DOM enhancer (it binds the author-provided <button data-part="root">
 * rather than rendering a shadow tree), so the markup carries the inner
 * button the element expects -- exactly what Astro emits, with the score's
 * initial projection already applied. Because the WC is light DOM, the
 * icon-only accessible-name pattern is expressible via aria-label on the
 * inner button.
 */
import { afterEach, beforeAll, describe, expect, it, test } from 'vitest';
import { page } from 'vitest/browser';
import userEvent from '@testing-library/user-event';
import { button, type ButtonConfig } from '../../../src/components/button/button.behavior';
import { buttonClasses } from '../../../src/components/button/button.classes';
import { RaftersButton } from '../../../src/components/button/button.element';
import { clearAllAnnouncers, getAnnouncerCount } from '../../../src/primitives/sr-announcer';

beforeAll(() => {
  if (!customElements.get('rafters-button')) customElements.define('rafters-button', RaftersButton);
});

test('custom element upgrades in a real browser', async () => {
  document.body.innerHTML =
    '<rafters-button><button data-part="root" id="b1">Go</button></rafters-button>';
  await expect.element(page.getByRole('button', { name: 'Go' })).toBeVisible();
  expect(document.querySelector('rafters-button')).toBeInstanceOf(RaftersButton);
});

interface ScenarioProps {
  variant?: ButtonConfig['variant'];
  size?: ButtonConfig['size'];
  disabled?: boolean;
  softDisabled?: boolean;
  loading?: boolean;
  toggle?: boolean;
  pressed?: boolean;
  ariaLabel?: string;
}

interface Scenario {
  name: string;
  props: ScenarioProps;
  expectedParts: ReadonlyArray<'root' | 'label' | 'spinner'>;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'idle default', props: {}, expectedParts: ['root', 'label'] },
  {
    name: 'destructive lg',
    props: { variant: 'destructive', size: 'lg' },
    expectedParts: ['root', 'label'],
  },
  { name: 'loading', props: { loading: true }, expectedParts: ['root', 'label', 'spinner'] },
  { name: 'toggle unpressed', props: { toggle: true }, expectedParts: ['root', 'label'] },
  {
    name: 'toggle pressed',
    props: { toggle: true, pressed: true },
    expectedParts: ['root', 'label'],
  },
  { name: 'soft-disabled', props: { softDisabled: true }, expectedParts: ['root', 'label'] },
  { name: 'hard disabled', props: { disabled: true }, expectedParts: ['root', 'label'] },
  {
    name: 'icon-only with accessible name',
    props: { size: 'icon', ariaLabel: 'Close' },
    expectedParts: ['root', 'label'],
  },
];

function configFor(props: ScenarioProps): ButtonConfig {
  return {
    variant: props.variant ?? 'default',
    size: props.size ?? 'default',
    toggle: props.toggle ?? false,
    disabled: props.disabled ?? false,
    softDisabled: props.softDisabled ?? false,
    loading: props.loading ?? false,
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

async function mountButton(props: ScenarioProps, label: string): Promise<HTMLElement> {
  const config = configFor(props);
  const state = button.initialState(config);
  const ids = { root: 'wc-root', label: 'wc-label', spinner: 'wc-spinner' };
  const aria = button.aria(state, config, ids);
  const classes = buttonClasses(config, state);

  const hostEl = document.createElement('rafters-button');

  const root = document.createElement('button');
  root.type = 'button';
  root.dataset['part'] = 'root';
  root.id = ids.root;
  root.className = classes.root;
  if (props.disabled) root.disabled = true;
  if (props.ariaLabel !== undefined) root.setAttribute('aria-label', props.ariaLabel);
  if (aria.root) applyAria(root, aria.root);

  if (props.loading) {
    const spinner = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    spinner.dataset['part'] = 'spinner';
    spinner.id = ids.spinner;
    spinner.setAttribute('class', classes.spinner);
    if (aria.spinner) applyAria(spinner, aria.spinner);
    root.appendChild(spinner);
  }

  const labelEl = document.createElement('span');
  labelEl.dataset['part'] = 'label';
  labelEl.id = ids.label;
  labelEl.textContent = label;
  root.appendChild(labelEl);

  hostEl.appendChild(root);
  document.body.appendChild(hostEl);
  // connectedCallback defers the bind one microtask (upgrade order); wait for it.
  await Promise.resolve();
  return root;
}

/** Every declared part present, and the rendered ARIA equal to the score's
 *  projection -- including absence: a projected `undefined` must not render. */
function assertContract(
  root: HTMLElement,
  state: ReturnType<typeof button.initialState>,
  config: ButtonConfig,
  expectedParts: ReadonlyArray<'root' | 'label' | 'spinner'>,
): void {
  for (const part of expectedParts) {
    const element =
      part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
    expect(element, `declared part "${part}" must be rendered`).not.toBeNull();
  }
  const ids = {
    root: root.id,
    label: root.querySelector<HTMLElement>('[data-part="label"]')?.id ?? '',
    spinner: root.querySelector<HTMLElement>('[data-part="spinner"]')?.id ?? '',
  };
  const projection = button.aria(state, config, ids);
  for (const part of Object.keys(button.parts) as Array<keyof typeof projection>) {
    const attrs = projection[part];
    if (!attrs || !expectedParts.includes(part)) continue;
    const element =
      part === 'root' ? root : root.querySelector<HTMLElement>(`[data-part="${part}"]`);
    expect(element, `part "${part}" carrying aria`).not.toBeNull();
    if (!element) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `part "${part}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `part "${part}" ${attr}`).toBe(String(value));
      }
    }
  }
}

describe('button [wc]', () => {
  afterEach(() => {
    for (const el of document.querySelectorAll('rafters-button')) el.remove();
    clearAllAnnouncers();
  });

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts and aria match the behavior projection`, async () => {
      const root = await mountButton(scenario.props, 'Save changes');
      const config = configFor(scenario.props);
      const state = button.initialState(config);
      assertContract(root, state, config, scenario.expectedParts);
    });
  }

  it('toggle: Enter and Space flip aria-pressed through the keymap', async () => {
    const root = await mountButton({ toggle: true }, 'Mute');
    expect(root.getAttribute('aria-pressed')).toBe('false');
    const user = userEvent.setup();
    root.focus();
    await user.keyboard('{Enter}');
    expect(root.getAttribute('aria-pressed')).toBe('true');
    await user.keyboard(' ');
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('loading at mount: aria-busy projected, announce suppressed (edge, not level)', async () => {
    // Markup that renders already-loading is the baseline for bindButton's
    // one-shot announce: aria-busy is projected but no live-region
    // announcement fires.
    expect(getAnnouncerCount()).toBe(0);
    const root = await mountButton({ loading: true }, 'Saving');
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(getAnnouncerCount()).toBe(0);
  });

  it('loading: activation is suppressed, focus is kept, label survives', async () => {
    const root = await mountButton({ toggle: true, loading: true }, 'Submit');
    expect(root.hasAttribute('disabled')).toBe(false);
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('[data-part="label"]')?.textContent).toContain('Submit');
    const user = userEvent.setup();
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('soft-disabled: discoverable, focusable, suppressed', async () => {
    const root = await mountButton({ toggle: true, softDisabled: true }, 'Archive');
    expect(root.hasAttribute('disabled')).toBe(false);
    expect(root.getAttribute('aria-disabled')).toBe('true');
    const user = userEvent.setup();
    await user.click(root);
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('hard disabled: native disabled only, no redundant aria-disabled', async () => {
    const root = await mountButton({ disabled: true }, 'Delete');
    expect(root.hasAttribute('disabled')).toBe(true);
    expect(root.hasAttribute('aria-disabled')).toBe(false);
  });
});
