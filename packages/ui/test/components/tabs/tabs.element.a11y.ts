import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/tabs/tabs.element';

interface Scene {
  active?: string;
  orientation?: 'horizontal' | 'vertical';
  disabledTabs?: string[];
}

const VALUES = ['overview', 'details', 'history'] as const;

/** The light-DOM markup the element conformance test mounts, inside a landmark. */
async function mount({
  active = 'overview',
  orientation = 'horizontal',
  disabledTabs = [],
}: Scene): Promise<HTMLElement> {
  const triggers = VALUES.map((value) => {
    const on = value === active;
    const disabled = disabledTabs.includes(value) ? ' disabled' : '';
    return `<button type="button" role="tab" data-part="trigger" data-value="${value}" id="t-tab-${value}" aria-controls="t-panel-${value}" aria-selected="${on}" data-state="${on ? 'active' : 'inactive'}"${disabled}>${value}</button>`;
  }).join('');
  const panels = VALUES.map((value) => {
    const on = value === active;
    return `<div role="tabpanel" data-part="panel" data-value="${value}" id="t-panel-${value}" aria-labelledby="t-tab-${value}" tabindex="0" data-state="${on ? 'active' : 'inactive'}"${on ? '' : ' hidden'}>${value} panel</div>`;
  }).join('');
  document.body.innerHTML = `
    <main>
      <rafters-tabs>
        <div data-part="root">
          <div data-part="list" role="tablist" aria-orientation="${orientation}">${triggers}</div>
          ${panels}
        </div>
      </rafters-tabs>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['first tab selected', {}],
  ['middle tab selected', { active: 'details' }],
  ['last tab selected', { active: 'history' }],
  ['vertical orientation', { orientation: 'vertical' }],
  ['one tab disabled', { disabledTabs: ['details'] }],
];

for (const [name, scene] of scenes) {
  test(`rafters-tabs ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
