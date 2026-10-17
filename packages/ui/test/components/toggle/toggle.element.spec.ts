/**
 * Web Component performance of the Toggle score. A light-DOM enhancer: the
 * element wraps slot="start-icon" / slot="end-icon" children and hands the
 * author's inner button to bindToggle. `toggle.element.ts` self-registers
 * `rafters-toggle` on import.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  toggle,
  type ToggleConfig,
  type ToggleSize,
  type ToggleVariant,
} from '../../../src/components/toggle/toggle.behavior';
import { toggleClasses } from '../../../src/components/toggle/toggle.classes';
import { RaftersToggle } from '../../../src/components/toggle/toggle.element';
import type { PartIds } from '../../../src/lib/contract';
import type { TogglePart } from '../../../src/components/toggle/toggle.behavior';

interface Scene {
  pressed?: boolean;
  disabled?: boolean;
  variant?: ToggleVariant;
  size?: ToggleSize;
  icons?: boolean;
}

function configOf(scene: Scene): ToggleConfig {
  return {
    variant: scene.variant ?? 'default',
    size: scene.size ?? 'default',
    toggle: true,
    defaultPressed: scene.pressed ?? false,
    disabled: scene.disabled ?? false,
  };
}

const ids = { root: 't-root', label: 't-label' } as PartIds<TogglePart>;

function projectedRoot(scene: Scene): Record<string, string> {
  const config = configOf(scene);
  const projected = toggle.aria(toggle.initialState(config), config, ids).root ?? {};
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(projected)) {
    if (value !== undefined) out[name] = String(value);
  }
  return out;
}

// The markup toggle.astro renders: the root with the initial projection applied.
function markup(scene: Scene): string {
  const classes = toggleClasses(configOf(scene), toggle.initialState(configOf(scene)));
  const attrs = Object.entries(projectedRoot(scene))
    .map(([name, value]) => `${name}="${value}"`)
    .join(' ');
  const icons = scene.icons ? '<svg slot="start-icon"></svg><svg slot="end-icon"></svg>' : '';
  return `<rafters-toggle><button type="button" data-part="root" id="t-root" class="${classes.root}" aria-label="Bold" ${attrs}${scene.disabled ? ' disabled' : ''}><span data-part="label" id="t-label">B</span></button>${icons}</rafters-toggle>`;
}

async function mount(scene: Scene = {}, wrap = (html: string) => html) {
  document.body.innerHTML = wrap(markup(scene));
  await Promise.resolve();
  const host = document.querySelector('rafters-toggle') as RaftersToggle;
  const root = host.querySelector('[data-part="root"]') as HTMLButtonElement;
  return { host, root };
}

// Every attribute the projection may own, read back from the live root.
function projectedAttrsOf(el: Element): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of ['aria-pressed', 'data-state', 'aria-disabled']) {
    const value = el.getAttribute(name);
    if (value !== null) out[name] = value;
  }
  return out;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('toggle [wc]', () => {
  it('upgrades to RaftersToggle and renders no shadow tree', async () => {
    const { host } = await mount();
    expect(host).toBeInstanceOf(RaftersToggle);
    expect(host.shadowRoot).toBeNull();
  });

  const scenes: ReadonlyArray<[string, Scene]> = [
    ['off', {}],
    ['seeded aria-pressed true', { pressed: true }],
    ['disabled', { disabled: true }],
    ['outline sm', { variant: 'outline', size: 'sm' }],
  ];
  for (const [name, scene] of scenes) {
    it(`root attributes equal the projection: ${name}`, async () => {
      const { root } = await mount(scene);
      expect(projectedAttrsOf(root)).toEqual(projectedRoot(scene));
      if (scene.disabled) {
        expect(root.hasAttribute('disabled')).toBe(true);
        expect(root.hasAttribute('aria-disabled')).toBe(false);
      }
    });
  }

  it('click flips aria-pressed and data-state', async () => {
    const { root } = await mount();
    await userEvent.click(page.getByRole('button', { name: 'Bold' }));
    expect(root.getAttribute('aria-pressed')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('on');
    await userEvent.click(page.getByRole('button', { name: 'Bold' }));
    expect(root.getAttribute('aria-pressed')).toBe('false');
    expect(root.getAttribute('data-state')).toBe('off');
  });

  it('Enter and Space flip the state', async () => {
    const { root } = await mount();
    root.focus();
    await userEvent.keyboard('{Enter}');
    expect(root.getAttribute('aria-pressed')).toBe('true');
    await userEvent.keyboard(' ');
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('a disabled toggle does not change', async () => {
    const { root } = await mount({ disabled: true });
    root.click();
    expect(root.getAttribute('aria-pressed')).toBe('false');
    expect(root.getAttribute('data-state')).toBe('off');
  });

  it('wraps icons: start, label, end, with hiding, data-icon and classes', async () => {
    const { root } = await mount({ icons: true });
    const classes = toggleClasses(configOf({}), toggle.initialState(configOf({})));
    const parts = [...root.children].map((c) => c.getAttribute('data-part'));
    expect(parts).toEqual(['startIcon', 'label', 'endIcon']);
    const start = root.querySelector('[data-part="startIcon"]') as HTMLElement;
    const end = root.querySelector('[data-part="endIcon"]') as HTMLElement;
    expect(start.getAttribute('aria-hidden')).toBe('true');
    expect(end.getAttribute('aria-hidden')).toBe('true');
    expect(start.dataset['icon']).toBe('inline-start');
    expect(end.dataset['icon']).toBe('inline-end');
    expect(start.className).toBe(classes.startIcon);
    expect(end.className).toBe(classes.endIcon);
    expect(root.querySelector('[slot]')).toBeNull();
  });

  it('contributes no form data and does not submit the form', async () => {
    let submitted = false;
    const { root } = await mount({}, (html) => `<form>${html}</form>`);
    const form = document.querySelector('form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submitted = true;
    });
    root.click();
    expect([...new FormData(form).keys()]).toEqual([]);
    expect(submitted).toBe(false);
  });

  it('removing and re-adding binds once and wraps icons once', async () => {
    const { host, root } = await mount({ icons: true });
    document.body.removeChild(host);
    document.body.appendChild(host);
    await Promise.resolve();
    root.click();
    expect(root.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelectorAll('[data-part="startIcon"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-part="endIcon"]')).toHaveLength(1);
  });

  it('issue functional test: icon wrapper, label order, click flips state', async () => {
    const config: ToggleConfig = { variant: 'default', size: 'default', toggle: true };
    const classes = toggleClasses(config, toggle.initialState(config));
    document.body.innerHTML = `<rafters-toggle>
  <button type="button" data-part="root" id="t-root" class="${classes.root}" aria-label="Bold"
    aria-pressed="false" data-state="off"><span data-part="label" id="t-label">B</span></button>
  <svg slot="start-icon"></svg></rafters-toggle>`;
    await Promise.resolve();
    const root = document.querySelector<HTMLButtonElement>(
      'rafters-toggle [data-part="root"]',
    ) as HTMLButtonElement;
    const start = root.querySelector<HTMLElement>('[data-part="startIcon"]') as HTMLElement;
    expect(start.nextElementSibling?.getAttribute('data-part')).toBe('label');
    expect(start.className).toBe(classes.startIcon);
    await userEvent.click(page.getByRole('button', { name: 'Bold' }));
    expect(root.getAttribute('aria-pressed')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('on');
  });

  it('binds nothing and throws nothing without a root', async () => {
    document.body.innerHTML = '<rafters-toggle></rafters-toggle>';
    await Promise.resolve();
    expect(document.querySelector('rafters-toggle')).not.toBeNull();
  });
});
