import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { switchClasses } from '../../../src/components/switch/switch.classes';
import '../../../src/components/switch/switch.element';

const classes = switchClasses({ variant: 'default', size: 'default' }, { checked: false });

const scenarios: ReadonlyArray<[string, string]> = [
  ['unchecked', 'aria-checked="false"'],
  ['seeded checked', 'aria-checked="true"'],
  ['required', 'aria-checked="false" aria-required="true"'],
  ['disabled', 'aria-checked="false" disabled'],
];

for (const [name, attrs] of scenarios) {
  test(`switch.element ${name}`, async ({ task }) => {
    document.body.innerHTML =
      `<main><rafters-switch><button type="button" role="switch" data-part="root" id="s-root" ` +
      `class="${classes.root}" aria-label="Wifi" ${attrs}>` +
      `<span data-part="thumb" id="s-thumb" class="${classes.thumb}"></span></button></rafters-switch></main>`;
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
