/**
 * Web Component performance of the Button score: a light-DOM enhancer that
 * binds the author-supplied inner root one microtask after connection.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { button, buttonConfigFromMarkup } from '../../../src/components/button/button.behavior';
import { RaftersButton } from '../../../src/components/button/button.element';
import { getAnnouncerCount } from '../../../src/primitives/sr-announcer';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const LABEL = '<span data-part="label">Go</span>';

async function mount(rootAttrs = '', content = LABEL, wrap = (html: string) => html) {
  document.body.innerHTML = wrap(
    `<rafters-button><button data-part="root" ${rootAttrs}>${content}</button></rafters-button>`,
  );
  await flush();
  const host = document.querySelector('rafters-button') as RaftersButton;
  return { host, inner: host.querySelector('button[data-part="root"]') as HTMLButtonElement };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('button [wc]', () => {
  it('is light DOM and its inner button is reachable by role', async () => {
    const { host } = await mount();
    expect(host).toBeInstanceOf(RaftersButton);
    expect(host.shadowRoot).toBeNull();
    await expect.element(page.getByRole('button', { name: 'Go' })).toBeVisible();
  });

  it('binds one microtask after connection', async () => {
    document.body.innerHTML = `<rafters-button><button data-part="root">${LABEL}</button></rafters-button>`;
    const inner = document.querySelector('button[data-part="root"]') as HTMLButtonElement;
    expect(inner.getAttribute('data-state')).toBeNull();
    await flush();
    expect(inner.getAttribute('data-state')).toBe('idle');
  });

  it('reads config from the projected markup', async () => {
    const toggle = await mount('aria-pressed="false"');
    toggle.inner.click();
    expect(toggle.inner.getAttribute('aria-pressed')).toBe('true');
    const loading = await mount('aria-busy="true"');
    expect(loading.inner.getAttribute('data-state')).toBe('loading');
  });

  const rows: ReadonlyArray<[string, string]> = [
    ['idle', ''],
    ['loading', 'aria-busy="true"'],
    ['soft-disabled', 'aria-disabled="true"'],
    ['hard disabled', 'disabled'],
    ['toggle off', 'aria-pressed="false"'],
    ['toggle on', 'aria-pressed="true"'],
  ];
  for (const [name, attrs] of rows) {
    it(`projects the score for ${name}`, async () => {
      const { inner } = await mount(attrs);
      const config = buttonConfigFromMarkup(inner);
      const ids = { root: inner.id, label: '', spinner: '', startIcon: '', endIcon: '' };
      const expected = button.aria(button.initialState(config), config, ids).root ?? {};
      expect(inner.getAttribute('data-state')).toBe(expected['data-state'] ?? null);
      for (const attr of ['aria-busy', 'aria-disabled', 'aria-pressed'] as const) {
        const want = expected[attr];
        expect(inner.getAttribute(attr)).toBe(want === undefined ? null : String(want));
      }
      if (name === 'hard disabled') {
        expect(inner.disabled).toBe(true);
        expect(inner.hasAttribute('aria-disabled')).toBe(false);
      }
    });
  }

  it('presses on click, Enter and Space only', async () => {
    const { inner } = await mount('aria-pressed="false"');
    inner.click();
    expect(inner.getAttribute('aria-pressed')).toBe('true');
    inner.focus();
    await userEvent.keyboard('{Enter}');
    expect(inner.getAttribute('aria-pressed')).toBe('false');
    await userEvent.keyboard(' ');
    expect(inner.getAttribute('aria-pressed')).toBe('true');
  });

  it('the gate cancels the submit of a rejected press', async () => {
    const cases = [
      ['aria-busy="true"', 0],
      ['aria-disabled="true"', 0],
      ['', 1],
    ] as const;
    for (const [attrs, expected] of cases) {
      const { inner } = await mount(
        `type="submit" ${attrs}`,
        LABEL,
        (html) => `<form>${html}</form>`,
      );
      let submits = 0;
      (document.querySelector('form') as HTMLFormElement).addEventListener('submit', (e) => {
        e.preventDefault();
        submits += 1;
      });
      inner.click();
      expect(submits).toBe(expected);
    }
  });

  it('wraps slotted icons in aria-hidden parts in reading order', async () => {
    const { inner } = await mount(
      '',
      `<svg slot="start-icon"></svg>${LABEL}<svg slot="end-icon"></svg>`,
    );
    const parts = Array.from(inner.querySelectorAll('[data-part]')).map((el) =>
      el.getAttribute('data-part'),
    );
    expect(parts).toEqual(['startIcon', 'label', 'endIcon']);
    const start = inner.querySelector('[data-part="startIcon"]') as HTMLElement;
    const end = inner.querySelector('[data-part="endIcon"]') as HTMLElement;
    expect(start.getAttribute('aria-hidden')).toBe('true');
    expect(end.getAttribute('aria-hidden')).toBe('true');
    expect(start.getAttribute('data-icon')).toBe('inline-start');
    expect(end.getAttribute('data-icon')).toBe('inline-end');
    expect(start.querySelector('svg')).not.toBeNull();
    expect(end.querySelector('svg')).not.toBeNull();
  });

  it('renders no icon wrapper without icon children', async () => {
    const { inner } = await mount();
    expect(inner.querySelector('[data-part="startIcon"], [data-part="endIcon"]')).toBeNull();
  });

  it('a baseline-loading mount does not announce', async () => {
    const before = getAnnouncerCount();
    await mount('aria-busy="true"');
    expect(getAnnouncerCount()).toBe(before);
  });

  it('tears the binding down on disconnect', async () => {
    const { host, inner } = await mount('aria-pressed="false"');
    host.remove();
    inner.click();
    expect(inner.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('button [wc] functional tests as written in the issue', () => {
  it('binds a toggle and presses it', async () => {
    document.body.innerHTML =
      '<rafters-button><button data-part="root" aria-pressed="false"><span data-part="label">Bold</span></button></rafters-button>';
    await Promise.resolve();
    await Promise.resolve();
    const inner = document.querySelector(
      'rafters-button button[data-part="root"]',
    ) as HTMLButtonElement;
    const config = buttonConfigFromMarkup(inner);
    expect(config.toggle).toBe(true);
    expect(inner.getAttribute('data-state')).toBe('idle');
    inner.click();
    expect(inner.getAttribute('aria-pressed')).toBe('true');
  });

  it('gate: a loading submit button does not submit', async () => {
    document.body.innerHTML =
      '<form><rafters-button><button type="submit" data-part="root" aria-busy="true"><span data-part="label">Save</span></button></rafters-button></form>';
    await Promise.resolve();
    await Promise.resolve();
    const form = document.querySelector('form') as HTMLFormElement;
    let submits = 0;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      submits += 1;
    });
    (form.querySelector('button') as HTMLButtonElement).click();
    expect(submits).toBe(0);
    expect(form.querySelector('button')?.getAttribute('data-state')).toBe('loading');
  });
});
