import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/accordion/accordion.element';

interface Scene {
  type?: 'single' | 'multiple';
  open?: string[];
  disabled?: boolean;
  disabledItems?: string[];
}

const SECTIONS: ReadonlyArray<[string, string]> = [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma'],
];

function section(value: string, label: string, expanded: boolean, disabled: boolean): string {
  const state = expanded ? 'open' : 'closed';
  return `
    <div data-part="item" data-value="${value}" data-state="${state}">
      <div data-part="heading" data-value="${value}" role="heading" aria-level="3">
        <button type="button" id="acc-trigger-${value}" data-part="trigger" data-value="${value}"
                data-roving-item data-state="${state}" aria-expanded="${expanded}"
                aria-controls="acc-content-${value}"${disabled ? ' disabled' : ''}>${label}</button>
      </div>
      <div id="acc-content-${value}" data-part="content" data-value="${value}" role="region"
           aria-labelledby="acc-trigger-${value}" data-state="${state}"${expanded ? '' : ' inert'}>
        Body ${label}
      </div>
    </div>`;
}

async function mount({
  type = 'single',
  open = [],
  disabled = false,
  disabledItems = [],
}: Scene): Promise<HTMLElement> {
  const sections = SECTIONS.map(([value, label]) =>
    section(value, label, open.includes(value), disabled || disabledItems.includes(value)),
  ).join('');
  document.body.innerHTML = `
    <main>
      <rafters-accordion>
        <div data-part="root" data-orientation="vertical" data-type="${type}" data-collapsible="false" data-heading-level="3"${disabled ? ' data-disabled="true"' : ''}>
          ${sections}
        </div>
      </rafters-accordion>
    </main>`;
  await Promise.resolve(); // the element binds one microtask after connecting
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['collapsed', {}],
  ['one section open', { open: ['b'] }],
  ['multiple with two open', { type: 'multiple', open: ['a', 'c'] }],
  ['one section disabled', { disabledItems: ['b'] }],
  ['whole accordion disabled', { disabled: true }],
];

for (const [name, scene] of scenes) {
  test(`rafters-accordion ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
