import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/badge/badge.element';
import { BADGE_SIZES, BADGE_VARIANTS } from '../../../src/components/badge/badge.behavior';

function mount(attrs: string, label: string): HTMLElement {
  document.body.innerHTML = `<main><rafters-badge ${attrs}>${label}</rafters-badge></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

for (const variant of BADGE_VARIANTS) {
  test(`rafters-badge variant=${variant}`, async ({ task }) => {
    const host = mount(`variant="${variant}"`, variant);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const size of BADGE_SIZES) {
  test(`rafters-badge size=${size}`, async ({ task }) => {
    const host = mount(`size="${size}"`, 'Label');
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
