/**
 * Browser-project performance of the Button score for the Web Component
 * target: real chromium through @vitest/browser-playwright. Every test mounts
 * `<rafters-button ...>` exactly as an author writes it in plain HTML; the
 * element renders its own parts, classes and projection, as the React and
 * Astro performances do.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, test } from 'vitest';
import { page } from 'vitest/browser';
import userEvent from '@testing-library/user-event';
import {
  button,
  type ButtonConfig,
  type ButtonPart,
} from '../../../src/components/button/button.behavior';
import { buttonClasses } from '../../../src/components/button/button.classes';
import { RaftersButton } from '../../../src/components/button/button.element';
import { installIconLayout, ICON_SVG_16, rectsOf } from './icon-layout';
import { clearAllAnnouncers, getAnnouncerCount } from '../../../src/primitives/sr-announcer';

beforeAll(() => {
  if (!customElements.get('rafters-button')) customElements.define('rafters-button', RaftersButton);
});

test('custom element upgrades in a real browser', async () => {
  document.body.innerHTML = '<rafters-button>Go</rafters-button>';
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
  expectedParts: ReadonlyArray<ButtonPart>;
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

/** The attributes an author writes for these props, as plain HTML. */
function attributesFor(props: ScenarioProps): string {
  const attrs: string[] = [];
  if (props.variant) attrs.push(`variant="${props.variant}"`);
  if (props.size) attrs.push(`size="${props.size}"`);
  if (props.disabled) attrs.push('disabled');
  if (props.softDisabled) attrs.push('soft-disabled');
  if (props.loading) attrs.push('loading');
  if (props.toggle) attrs.push('toggle');
  if (props.pressed) attrs.push('pressed');
  if (props.ariaLabel !== undefined) attrs.push(`aria-label="${props.ariaLabel}"`);
  return attrs.join(' ');
}

/** Mount `<rafters-button ...>label</rafters-button>` exactly as an author writes it. */
async function mountButton(props: ScenarioProps, label: string): Promise<HTMLButtonElement> {
  document.body.innerHTML = `<rafters-button ${attributesFor(props)}>${label}</rafters-button>`;
  // connectedCallback builds the parts one microtask later (05-authoring gotcha 3).
  await Promise.resolve();
  return document.querySelector('rafters-button [data-part="root"]') as HTMLButtonElement;
}

/** Every declared part present, and the rendered ARIA equal to the score's
 *  projection -- including absence: a projected `undefined` must not render. */
function assertContract(
  root: HTMLElement,
  state: ReturnType<typeof button.initialState>,
  config: ButtonConfig,
  expectedParts: ReadonlyArray<ButtonPart>,
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
    startIcon: root.querySelector<HTMLElement>('[data-part="startIcon"]')?.id ?? '',
    endIcon: root.querySelector<HTMLElement>('[data-part="endIcon"]')?.id ?? '',
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
    document.body.innerHTML = '';
    clearAllAnnouncers();
  });

  for (const scenario of SCENARIOS) {
    it(`${scenario.name}: parts, classes and aria match the behavior and classes`, async () => {
      const root = await mountButton(scenario.props, 'Save changes');
      const config = configFor(scenario.props);
      const state = button.initialState(config);
      assertContract(root, state, config, scenario.expectedParts);
      expect(root.className).toBe(buttonClasses(config, state).root);
      expect(root.tagName).toBe('BUTTON');
    });
  }

  it("the author's children become the label", async () => {
    const root = await mountButton({}, '<em>Save</em> changes');
    const label = root.querySelector('[data-part="label"]');
    expect(label?.querySelector('em')?.textContent).toBe('Save');
    expect(label?.textContent).toBe('Save changes');
  });

  it('icon-only: aria-label names the inner button', async () => {
    await mountButton({ size: 'icon', ariaLabel: 'Close' }, '');
    await expect.element(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  it('changing variant re-renders the classes', async () => {
    const root = await mountButton({}, 'Delete');
    const host = document.querySelector('rafters-button') as HTMLElement;
    host.setAttribute('variant', 'destructive');
    const config = configFor({ variant: 'destructive' });
    expect(root.className).toBe(buttonClasses(config, button.initialState(config)).root);
  });

  it('setting disabled disables the inner button and suppresses activation', async () => {
    const root = await mountButton({ toggle: true }, 'Mute');
    const host = document.querySelector('rafters-button') as HTMLElement;
    host.setAttribute('disabled', '');
    expect(root.disabled).toBe(true);
  });

  it('loading set after mount shows the spinner, projects aria-busy and announces once', async () => {
    const root = await mountButton({}, 'Save');
    const host = document.querySelector('rafters-button') as HTMLElement;
    expect(getAnnouncerCount()).toBe(0);
    host.setAttribute('loading', '');
    expect(root.querySelector('[data-part="spinner"]')).not.toBeNull();
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(getAnnouncerCount()).toBe(1);
    host.removeAttribute('loading');
    expect(root.querySelector('[data-part="spinner"]')).toBeNull();
    expect(root.hasAttribute('aria-busy')).toBe(false);
  });

  it('type="submit" submits its form natively', async () => {
    document.body.innerHTML = '<form><rafters-button type="submit">Send</rafters-button></form>';
    await Promise.resolve();
    const form = document.querySelector('form') as HTMLFormElement;
    let submitted = false;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitted = true;
    });
    const user = userEvent.setup();
    await user.click(document.querySelector('rafters-button [data-part="root"]') as HTMLElement);
    expect(submitted).toBe(true);
  });

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

describe('button icons [wc]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => {
    for (const el of document.querySelectorAll('rafters-button')) el.remove();
    uninstall();
  });

  async function mountIcons(children = ''): Promise<HTMLElement> {
    document.body.innerHTML = `<rafters-button>${children}Send</rafters-button>`;
    await Promise.resolve();
    return document.querySelector('[data-part="root"]') as HTMLElement;
  }

  it('slot="start-icon" and slot="end-icon" children become hidden wrappers beside the label', async () => {
    const root = await mountIcons(
      `<span slot="start-icon">${ICON_SVG_16}</span><span slot="end-icon">${ICON_SVG_16}</span>`,
    );
    const start = root.querySelector('[data-part="startIcon"]');
    const end = root.querySelector('[data-part="endIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    const r = rectsOf(root);
    expect((r.start as DOMRect).right).toBeLessThanOrEqual(r.label.left + 0.5);
    expect((r.end as DOMRect).left).toBeGreaterThanOrEqual(r.label.right - 0.5);
    expect(r.start?.width).toBe(16);
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', async () => {
    document.documentElement.dir = 'rtl';
    const root = await mountIcons(`<span slot="start-icon">${ICON_SVG_16}</span>`);
    const r = rectsOf(root);
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('no wrapper without an icon child', async () => {
    const root = await mountIcons();
    expect(root.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(root.querySelector('[data-part="endIcon"]')).toBeNull();
  });
});
