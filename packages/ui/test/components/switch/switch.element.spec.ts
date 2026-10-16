import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { switchBehavior, type SwitchConfig } from '../../../src/components/switch/switch.behavior';
import { switchClasses } from '../../../src/components/switch/switch.classes';
import { RaftersSwitch } from '../../../src/components/switch/switch.element';

const config: SwitchConfig = { variant: 'default', size: 'default', name: 'wifi', value: 'yes' };
const IDS = { root: 's-root', thumb: 's-thumb' };

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(attrs = 'aria-checked="false"'): Promise<{
  host: HTMLElement;
  root: HTMLElement;
  thumb: HTMLElement;
}> {
  const classes = switchClasses(config, { checked: false });
  document.body.innerHTML = `<form><rafters-switch>
  <button type="button" role="switch" data-part="root" id="s-root" class="${classes.root}"
    name="wifi" value="yes" data-name="wifi" data-value="yes" aria-label="Wifi" ${attrs}>
    <span data-part="thumb" id="s-thumb" class="${classes.thumb}"></span>
  </button></rafters-switch></form>`;
  await Promise.resolve();
  const host = document.querySelector<HTMLElement>('rafters-switch');
  const root = host?.querySelector<HTMLElement>('[data-part="root"]');
  const thumb = host?.querySelector<HTMLElement>('[data-part="thumb"]');
  if (!host || !root || !thumb) throw new Error('mount failed');
  return { host, root, thumb };
}

function expectProjection(
  el: HTMLElement,
  attrs: Record<string, string | undefined> | undefined,
): void {
  for (const [k, v] of Object.entries(attrs ?? {})) {
    expect(el.getAttribute(k), k).toBe(v === undefined ? null : String(v));
  }
}

describe('rafters-switch', () => {
  it('upgrades in light DOM with no shadow root', async () => {
    const { host } = await mount();
    expect(host).toBeInstanceOf(RaftersSwitch);
    expect(host.shadowRoot).toBeNull();
  });

  const scenarios: ReadonlyArray<[string, string, SwitchConfig, boolean]> = [
    ['unchecked', 'aria-checked="false"', config, false],
    ['seeded checked', 'aria-checked="true"', { ...config, defaultChecked: true }, true],
    ['required', 'aria-checked="false" aria-required="true"', { ...config, required: true }, false],
    ['disabled', 'aria-checked="false" disabled', { ...config, disabled: true }, false],
  ];

  for (const [name, attrs, cfg, checked] of scenarios) {
    it(`projects the score after the bind: ${name}`, async () => {
      const { root, thumb } = await mount(attrs);
      const proj = switchBehavior.aria({ checked }, cfg, IDS);
      expectProjection(root, proj.root);
      expectProjection(thumb, proj.thumb);
    });
  }

  it('toggles on click, Space and Enter, delivering one change each', async () => {
    const user = userEvent.setup();
    const { host, root, thumb } = await mount();
    let changes = 0;
    host.addEventListener('change', () => changes++);
    await user.click(root);
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(root.getAttribute('data-state')).toBe('checked');
    expect(thumb.getAttribute('data-state')).toBe('checked');
    expect(changes).toBe(1);
    root.focus();
    await user.keyboard(' ');
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(changes).toBe(2);
    await user.keyboard('{Enter}');
    expect(root.getAttribute('aria-checked')).toBe('true');
    expect(thumb.getAttribute('data-state')).toBe('checked');
    expect(changes).toBe(3);
  });

  it('matches the score after a toggle and contributes nothing to FormData', async () => {
    const user = userEvent.setup();
    const { root } = await mount();
    await user.click(root);
    expectProjection(root, switchBehavior.aria({ checked: true }, config, IDS).root);
    const form = document.querySelector('form');
    if (!form) throw new Error('no form');
    expect(new FormData(form).getAll('wifi')).toEqual([]);
  });

  it('does not change or emit when disabled', async () => {
    const { host, root, thumb } = await mount('aria-checked="false" disabled');
    let changes = 0;
    host.addEventListener('change', () => changes++);
    root.click();
    expect(root.getAttribute('aria-checked')).toBe('false');
    expect(thumb.getAttribute('data-state')).toBe('unchecked');
    expect(changes).toBe(0);
  });

  it('leaves one bind after remove and re-add', async () => {
    const user = userEvent.setup();
    const { host, root } = await mount();
    const parent = host.parentElement;
    if (!parent) throw new Error('no parent');
    host.remove();
    parent.appendChild(host);
    await Promise.resolve();
    let changes = 0;
    host.addEventListener('change', () => changes++);
    await user.click(root);
    expect(changes).toBe(1);
  });

  it('binds nothing and throws nothing without a root', async () => {
    document.body.innerHTML = '<rafters-switch></rafters-switch>';
    await Promise.resolve();
    expect(document.querySelector('rafters-switch')).toBeInstanceOf(RaftersSwitch);
  });
});
