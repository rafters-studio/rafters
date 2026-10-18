/**
 * Web Component performance of the Button score: <rafters-button> renders the
 * button.tsx tree in light DOM with the shared classes, and binds it with
 * bindButton one microtask after connection.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { button, type ButtonConfig } from '../../../src/components/button/button.behavior';
import { buttonClasses } from '../../../src/components/button/button.classes';
import { RaftersButton } from '../../../src/components/button/button.element';
import { clearAllAnnouncers, getAnnouncerCount } from '../../../src/primitives/sr-announcer';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const DEFAULTS: ButtonConfig = { variant: 'default', size: 'default' };

async function mount(attrs = '', content = 'Go') {
  document.body.innerHTML = `<rafters-button ${attrs}>${content}</rafters-button>`;
  await flush();
  const host = document.querySelector('rafters-button') as RaftersButton;
  const root = host.querySelector(':scope > button[data-part="root"]') as HTMLButtonElement;
  return { host, root };
}

function expectedClasses(config: ButtonConfig) {
  return buttonClasses(config, button.initialState(config));
}

beforeEach(() => {
  clearAllAnnouncers();
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('button [wc]', () => {
  it('renders the root and label in light DOM, reachable by role', async () => {
    const { host, root } = await mount();
    expect(host).toBeInstanceOf(RaftersButton);
    expect(host.shadowRoot).toBeNull();
    expect(root).not.toBeNull();
    expect(root.querySelector(':scope > [data-part="label"]')?.textContent).toBe('Go');
    await expect.element(page.getByRole('button', { name: 'Go' })).toBeVisible();
  });

  it('renders and binds one microtask after connection', async () => {
    document.body.innerHTML = '<rafters-button>Go</rafters-button>';
    const host = document.querySelector('rafters-button') as RaftersButton;
    expect(host.querySelector('button')).toBeNull();
    await flush();
    expect(host.querySelector('button')?.getAttribute('data-state')).toBe('idle');
  });

  const looks: ReadonlyArray<[string, ButtonConfig]> = [
    ['', DEFAULTS],
    ['variant="destructive"', { variant: 'destructive', size: 'default' }],
    ['variant="ghost" size="sm"', { variant: 'ghost', size: 'sm' }],
    ['variant="success" size="lg"', { variant: 'success', size: 'lg' }],
    ['variant="nope" size="huge"', DEFAULTS],
  ];
  for (const [attrs, config] of looks) {
    it(`paints buttonClasses for [${attrs || 'defaults'}]`, async () => {
      const { root } = await mount(attrs);
      expect(root.className).toBe(expectedClasses(config).root);
    });
  }

  const states: ReadonlyArray<[string, string, ButtonConfig, string]> = [
    ['idle', '', DEFAULTS, 'idle'],
    ['loading', 'loading', { ...DEFAULTS, loading: true }, 'loading'],
    ['soft-disabled', 'soft-disabled', { ...DEFAULTS, softDisabled: true }, 'soft-disabled'],
    ['toggle', 'toggle', { ...DEFAULTS, toggle: true }, 'idle'],
    [
      'toggle pressed',
      'toggle default-pressed',
      { ...DEFAULTS, toggle: true, defaultPressed: true },
      'idle',
    ],
  ];
  for (const [name, attrs, config, dataState] of states) {
    it(`projects the score for ${name}`, async () => {
      const { root } = await mount(attrs);
      const ids = {
        root: root.id,
        label: '',
        spinner: '',
        startIcon: '',
        endIcon: '',
      };
      const projection = button.aria(button.initialState(config), config, ids).root ?? {};
      for (const [attr, value] of Object.entries(projection)) {
        if (value === undefined) expect(root.hasAttribute(attr)).toBe(false);
        else expect(root.getAttribute(attr)).toBe(String(value));
      }
      expect(root.getAttribute('data-state')).toBe(dataState);
    });
  }

  it('uses native disabled only when disabled', async () => {
    const { root } = await mount('disabled');
    expect(root.disabled).toBe(true);
    expect(root.hasAttribute('aria-disabled')).toBe(false);
  });

  it('keeps the label and adds an aria-hidden spinner while loading', async () => {
    const { root } = await mount('loading');
    const spinner = root.querySelector(':scope > [data-part="spinner"]');
    expect(spinner).not.toBeNull();
    expect(spinner?.getAttribute('class')).toBe(
      expectedClasses({ ...DEFAULTS, loading: true }).spinner,
    );
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
    expect(root.querySelector('[data-part="label"]')?.textContent).toBe('Go');
  });

  it('places slotted icons in aria-hidden icon parts and the rest in the label', async () => {
    const { root } = await mount(
      '',
      '<svg slot="start-icon" data-testid="s"></svg>Send<svg slot="end-icon" data-testid="e"></svg>',
    );
    const parts = Array.from(root.children).map((el) => el.getAttribute('data-part'));
    expect(parts).toEqual(['startIcon', 'label', 'endIcon']);
    const start = root.querySelector('[data-part="startIcon"]') as HTMLElement;
    const end = root.querySelector('[data-part="endIcon"]') as HTMLElement;
    expect(start.getAttribute('aria-hidden')).toBe('true');
    expect(end.getAttribute('aria-hidden')).toBe('true');
    expect(start.getAttribute('data-icon')).toBe('inline-start');
    expect(end.getAttribute('data-icon')).toBe('inline-end');
    expect(start.className).toBe(expectedClasses(DEFAULTS).startIcon);
    expect(start.querySelector('[data-testid="s"]')?.hasAttribute('slot')).toBe(false);
    expect(root.querySelector('[data-part="label"]')?.textContent).toBe('Send');
    await expect.element(page.getByRole('button', { name: 'Send' })).toBeVisible();
  });

  it('renders no icon parts when no icon is given', async () => {
    const { root } = await mount();
    expect(root.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(root.querySelector('[data-part="endIcon"]')).toBeNull();
  });

  it('a toggle press flips aria-pressed', async () => {
    const { root } = await mount('toggle');
    root.click();
    expect(root.getAttribute('aria-pressed')).toBe('true');
    root.click();
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });

  it('re-paints and re-projects when an attribute changes', async () => {
    const { host, root } = await mount();
    host.setAttribute('variant', 'destructive');
    expect(root.className).toBe(expectedClasses({ variant: 'destructive', size: 'default' }).root);
    host.setAttribute('loading', '');
    expect(root.getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('[data-part="spinner"]')).not.toBeNull();
    host.removeAttribute('loading');
    expect(root.hasAttribute('aria-busy')).toBe(false);
    expect(root.querySelector('[data-part="spinner"]')).toBeNull();
    host.setAttribute('disabled', '');
    expect(root.disabled).toBe(true);
  });

  it('announces on a loading false->true edge, not on a loading mount', async () => {
    await mount('loading');
    expect(getAnnouncerCount()).toBe(0);
    const { host } = await mount();
    host.setAttribute('loading', '');
    expect(getAnnouncerCount()).toBe(1);
  });

  it('submits its form as a native submit button', async () => {
    document.body.innerHTML = '<form><rafters-button type="submit">Send</rafters-button></form>';
    await flush();
    const form = document.querySelector('form') as HTMLFormElement;
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', onSubmit);
    (document.querySelector('button') as HTMLButtonElement).click();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('a gated press does not submit the form', async () => {
    document.body.innerHTML =
      '<form><rafters-button type="submit" soft-disabled>Send</rafters-button></form>';
    await flush();
    const form = document.querySelector('form') as HTMLFormElement;
    const onSubmit = vi.fn((event: Event) => event.preventDefault());
    form.addEventListener('submit', onSubmit);
    (document.querySelector('button') as HTMLButtonElement).click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('moves aria-label from the host to the inner button', async () => {
    const { host, root } = await mount('size="icon" aria-label="Close"', '<svg></svg>');
    expect(root.getAttribute('aria-label')).toBe('Close');
    expect(host.hasAttribute('aria-label')).toBe(false);
    await expect.element(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  it('warns when an icon size has no accessible name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount('size="icon"', '<svg></svg>');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('aria-label');
  });

  it('does not warn when an icon size is named', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await mount('size="icon" aria-label="Close"', '<svg></svg>');
    expect(warn).not.toHaveBeenCalled();
  });

  it('reuses its tree when reconnected', async () => {
    const { host, root } = await mount('toggle');
    const parent = host.parentElement as HTMLElement;
    host.remove();
    parent.append(host);
    await flush();
    expect(host.querySelectorAll('button[data-part="root"]')).toHaveLength(1);
    expect(host.querySelector('button')).toBe(root);
    root.click();
    expect(root.getAttribute('aria-pressed')).toBe('true');
  });

  it('tears the binding down on disconnect', async () => {
    const { host, root } = await mount('toggle');
    host.remove();
    root.click();
    expect(root.getAttribute('aria-pressed')).toBe('false');
  });
});
