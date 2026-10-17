import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/collapsible/collapsible.element';

function mount(open: boolean, disabled: boolean): HTMLElement {
  document.body.innerHTML = `<main><rafters-collapsible data-part="root" default-open="${String(open)}">
    <button type="button" id="c-trigger" data-part="trigger" ${disabled ? 'disabled' : ''}>Toggle</button>
    <div id="c-content" data-part="content" ${open ? '' : 'hidden'}><p>Body</p></div>
  </rafters-collapsible></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, boolean, boolean]> = [
  ['closed', false, false],
  ['open', true, false],
  ['disabled', false, true],
];

for (const [name, open, disabled] of scenes) {
  test(`rafters-collapsible ${name}`, async ({ task }) => {
    const host = mount(open, disabled);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
