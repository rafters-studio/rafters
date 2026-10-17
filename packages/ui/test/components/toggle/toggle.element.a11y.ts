import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/toggle/toggle.element';

const button = (extra: string, label = '<span data-part="label">Bold</span>') =>
  `<button type="button" data-part="root" ${extra}>${label}</button>`;

const scenes: ReadonlyArray<[string, string]> = [
  ['off', button('aria-pressed="false" data-state="off"')],
  ['pressed', button('aria-pressed="true" data-state="on"')],
  ['disabled', button('aria-pressed="false" data-state="off" disabled')],
  [
    'icon-only with accessible name',
    `${button('aria-label="Bold" aria-pressed="false" data-state="off"', '<span data-part="label"></span>')}<svg slot="start-icon" viewBox="0 0 24 24"><title>Mail</title></svg>`,
  ],
];

for (const [name, inner] of scenes) {
  test(`rafters-toggle ${name}`, async ({ task }) => {
    document.body.innerHTML = `<main><rafters-toggle>${inner}</rafters-toggle></main>`;
    await Promise.resolve();
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
