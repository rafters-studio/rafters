/**
 * Web Component performance of the input-group score. The element enhances
 * author light-DOM markup and calls bindInputGroup unchanged.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { inputGroupBehavior } from '../../../src/components/input-group/input-group.behavior';
import { RaftersInputGroup } from '../../../src/components/input-group/input-group.element';

const INPUT = '<input id="amount" name="amount" value="5" aria-label="Amount">';

function affixes(inner: string): string {
  return `<div data-part="addonStart">$</div>${inner}<div data-part="addonEnd">USD</div>`;
}

async function mount(attrs: string, inner: string, wrap = false): Promise<RaftersInputGroup> {
  const group = `<rafters-input-group ${attrs}>${inner}</rafters-input-group>`;
  document.body.innerHTML = wrap ? `<form>${group}</form>` : group;
  await Promise.resolve();
  return document.body.querySelector('rafters-input-group') as RaftersInputGroup;
}

type Part = 'root' | 'control' | 'addonStart' | 'addonEnd';

function partEl(root: HTMLElement, part: Part): HTMLElement | null {
  return part === 'root' ? root : root.querySelector(`[data-part="${part}"]`);
}

function expectProjection(root: HTMLElement, config: { invalid?: boolean }): void {
  const ids = {
    root: root.id,
    control: partEl(root, 'control')?.id ?? '',
    addonStart: partEl(root, 'addonStart')?.id ?? '',
    addonEnd: partEl(root, 'addonEnd')?.id ?? '',
  };
  const projection = inputGroupBehavior.aria({}, config, ids);
  for (const part of ['root', 'control', 'addonStart', 'addonEnd'] as const) {
    const el = partEl(root, part);
    if (!el) continue;
    for (const [k, v] of Object.entries(projection[part] ?? {})) {
      expect(el.getAttribute(k)).toBe(v === undefined ? null : String(v));
    }
  }
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('input-group [wc]', () => {
  it('upgrades to RaftersInputGroup in light DOM and stamps the bare control', async () => {
    const root = await mount('', affixes(INPUT));
    expect(root).toBeInstanceOf(RaftersInputGroup);
    expect(root.shadowRoot).toBeNull();
    expect(root.querySelector('input')?.getAttribute('data-part')).toBe('control');
  });

  it('projects the score for valid, invalid and affixless scenarios', async () => {
    expectProjection(await mount('', affixes(INPUT)), {});
    expectProjection(await mount('data-invalid', affixes(INPUT)), { invalid: true });
    expectProjection(await mount('', INPUT), {});
  });

  it('marks invalid on the control and root only when data-invalid', async () => {
    const bad = await mount('data-invalid', affixes(INPUT));
    expect(bad.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
    expect(bad.getAttribute('data-state')).toBe('invalid');
    const ok = await mount('', affixes(INPUT));
    expect(ok.querySelector('input')?.hasAttribute('aria-invalid')).toBe(false);
  });

  it.each(['disabled', 'data-disabled'])('%s disables the control and addon button', async (a) => {
    const root = await mount(a, affixes(INPUT).replace('USD', '<button type="button">Go</button>'));
    expect(root.querySelector('input')?.disabled).toBe(true);
    expect(root.querySelector('button')?.disabled).toBe(true);
  });

  it('keeps an author-disabled input disabled inside an enabled group', async () => {
    const root = await mount('', '<input disabled aria-label="x">');
    expect(root.querySelector('input')?.disabled).toBe(true);
  });

  it('contributes one FormData entry, and none while disabled', async () => {
    await mount('', affixes(INPUT), true);
    const form = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(form).getAll('amount')).toEqual(['5']);
    await mount('disabled', affixes(INPUT), true);
    const disabledForm = document.querySelector('form') as HTMLFormElement;
    expect(new FormData(disabledForm).getAll('amount')).toEqual([]);
  });

  it('matches the issue functional test as written', async () => {
    document.body.innerHTML = `<form>
  <rafters-input-group data-invalid>
    <div data-part="addonStart">$</div>
    <input id="amount" name="amount" value="5" aria-label="Amount">
    <div data-part="addonEnd">USD</div>
  </rafters-input-group>
</form>`;
    await Promise.resolve();
    const root = document.querySelector<HTMLElement>('rafters-input-group') as HTMLElement;
    const control = root.querySelector<HTMLInputElement>('[data-part="control"]') as HTMLElement;
    const ids = {
      root: root.id,
      control: control.id,
      addonStart: (root.querySelector('[data-part="addonStart"]') as HTMLElement).id,
      addonEnd: (root.querySelector('[data-part="addonEnd"]') as HTMLElement).id,
    };
    const projection = inputGroupBehavior.aria({}, { invalid: true }, ids);
    for (const [k, v] of Object.entries(projection.control ?? {})) {
      expect(control.getAttribute(k)).toBe(v === undefined ? null : String(v));
    }
    expect(root.getAttribute('data-state')).toBe('invalid');
    expect(
      new FormData(document.querySelector('form') as HTMLFormElement).getAll('amount'),
    ).toEqual(['5']);
  });

  it('upgrades a host with no control without throwing', async () => {
    const root = await mount('', '<span>none</span>');
    expect(root).toBeInstanceOf(RaftersInputGroup);
  });

  it('survives removal and re-adding with the projection in place', async () => {
    const root = await mount('data-invalid', affixes(INPUT));
    const parent = root.parentElement as HTMLElement;
    root.remove();
    parent.appendChild(root);
    await Promise.resolve();
    expect(root.getAttribute('data-state')).toBe('invalid');
    expect(root.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });
});
