/**
 * Web Component performance of the checkbox score, driven end to end in real
 * chromium. Parts, classes and ARIA come from the element, not the test.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import {
  checkbox,
  type CheckboxConfig,
  type CheckboxState,
} from '../../../src/components/checkbox/checkbox.behavior';
import { checkboxClasses } from '../../../src/components/checkbox/checkbox.classes';
import { RaftersCheckbox } from '../../../src/components/checkbox/checkbox.element';

interface Scenario {
  name: string;
  attrs: string;
  config: CheckboxConfig;
  state: CheckboxState;
}

const SCENARIOS: ReadonlyArray<Scenario> = [
  { name: 'unchecked', attrs: '', config: {}, state: { checked: false } },
  { name: 'seeded checked', attrs: 'checked', config: {}, state: { checked: true } },
  {
    name: 'indeterminate',
    attrs: 'checked="indeterminate"',
    config: {},
    state: { checked: 'indeterminate' },
  },
  { name: 'required', attrs: 'required', config: { required: true }, state: { checked: false } },
  { name: 'disabled', attrs: 'disabled', config: { disabled: true }, state: { checked: false } },
  {
    name: 'destructive lg',
    attrs: 'variant="destructive" size="lg"',
    config: { variant: 'destructive', size: 'lg' },
    state: { checked: false },
  },
];

async function mount(markup: string): Promise<void> {
  document.body.innerHTML = markup;
  await Promise.resolve();
}

function rootOf(): HTMLButtonElement {
  const root = document.querySelector<HTMLButtonElement>('rafters-checkbox [data-part="root"]');
  if (!root) throw new Error('no root part rendered');
  return root;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('checkbox [wc]', () => {
  it('registers the rafters-checkbox tag and renders in light DOM', async () => {
    expect(customElements.get('rafters-checkbox')).toBe(RaftersCheckbox);
    await mount('<rafters-checkbox aria-label="Accept"></rafters-checkbox>');
    const host = document.querySelector('rafters-checkbox');
    expect(host).toBeInstanceOf(RaftersCheckbox);
    expect(host?.shadowRoot).toBeNull();
    expect(rootOf().querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
    expect(host?.querySelector('[data-part="hidden-input"]')).toBeNull();
  });

  for (const { name, attrs, config, state } of SCENARIOS) {
    it(`${name}: classes and ARIA equal the score's projection`, async () => {
      await mount(`<rafters-checkbox ${attrs} aria-label="Accept"></rafters-checkbox>`);
      const root = rootOf();
      const classes = checkboxClasses(config, state);
      expect(root.className).toBe(classes.root);
      const svgs = root.querySelectorAll('svg');
      expect(svgs[0]?.getAttribute('class')).toBe(classes.check);
      expect(svgs[1]?.getAttribute('class')).toBe(classes.dash);
      const projected = checkbox.aria(state, config, { root: root.id }).root ?? {};
      for (const [key, value] of Object.entries(projected)) {
        expect(root.getAttribute(key)).toBe(value === undefined ? null : String(value));
      }
      expect(root.disabled).toBe(config.disabled ?? false);
      expect(root.hasAttribute('aria-disabled')).toBe(false);
    });
  }

  it('falls back to defaults for variant and size outside the enum', async () => {
    await mount('<rafters-checkbox variant="nope" size="huge"></rafters-checkbox>');
    expect(rootOf().className).toBe(checkboxClasses({}, { checked: false }).root);
  });

  it('click steps unchecked -> checked -> unchecked', async () => {
    await mount('<rafters-checkbox aria-label="Accept"></rafters-checkbox>');
    const root = rootOf();
    await userEvent.click(page.getByRole('checkbox', { name: 'Accept' }));
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('checked');
    await userEvent.click(page.getByRole('checkbox', { name: 'Accept' }));
    expect(root.getAttribute('aria-checked')).toBe('false');
  });

  it('indeterminate toggles to checked, never to mixed', async () => {
    await mount(
      '<rafters-checkbox checked="indeterminate" aria-label="Accept"></rafters-checkbox>',
    );
    const root = rootOf();
    expect(root.getAttribute('aria-checked')).toBe('mixed');
    await userEvent.click(page.getByRole('checkbox', { name: 'Accept' }));
    expect(root.getAttribute('aria-checked')).toBe('true');
  });

  it('Space and Enter toggle', async () => {
    await mount('<rafters-checkbox aria-label="Accept"></rafters-checkbox>');
    const root = rootOf();
    root.focus();
    await userEvent.keyboard(' ');
    expect(root.getAttribute('aria-checked')).toBe('true');
    await userEvent.keyboard('{Enter}');
    expect(root.getAttribute('aria-checked')).toBe('false');
  });

  it('a disabled box does not change', async () => {
    await mount('<rafters-checkbox disabled aria-label="Accept"></rafters-checkbox>');
    const root = rootOf();
    root.click();
    expect(root.getAttribute('aria-checked')).toBe('false');
  });

  it('submits name=value only while checked and enabled', async () => {
    await mount(
      '<form><rafters-checkbox name="terms" value="yes" aria-label="Accept"></rafters-checkbox></form>',
    );
    const form = document.querySelector('form') as HTMLFormElement;
    const root = rootOf();
    expect(new FormData(form).getAll('terms')).toEqual([]);
    await userEvent.click(page.getByRole('checkbox', { name: 'Accept' }));
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(new FormData(form).getAll('terms')).toEqual(['yes']);
    await userEvent.click(page.getByRole('checkbox', { name: 'Accept' }));
    expect(new FormData(form).getAll('terms')).toEqual([]);
  });

  it('value defaults to on; disabled never submits', async () => {
    await mount(
      '<form><rafters-checkbox name="a" checked aria-label="A"></rafters-checkbox>' +
        '<rafters-checkbox name="b" checked disabled aria-label="B"></rafters-checkbox></form>',
    );
    const data = new FormData(document.querySelector('form') as HTMLFormElement);
    expect(data.getAll('a')).toEqual(['on']);
    expect(data.getAll('b')).toEqual([]);
  });

  it('remove and re-add leaves one set of parts and still toggles', async () => {
    await mount('<rafters-checkbox name="n" aria-label="Accept"></rafters-checkbox>');
    const host = document.querySelector('rafters-checkbox') as HTMLElement;
    host.remove();
    document.body.appendChild(host);
    await Promise.resolve();
    expect(host.querySelectorAll('[data-part="root"]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-part="hidden-input"]')).toHaveLength(1);
    expect(host.querySelectorAll('svg')).toHaveLength(2);
    await userEvent.click(page.getByRole('checkbox', { name: 'Accept' }));
    expect(rootOf().getAttribute('aria-checked')).toBe('true');
  });
});
