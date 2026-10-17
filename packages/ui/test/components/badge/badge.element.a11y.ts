import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { BADGE_VARIANTS } from '../../../src/components/badge/badge.behavior';
import '../../../src/components/badge/badge.element';

const icons =
  '<svg slot="start-icon" viewBox="0 0 1 1"></svg>Live<svg slot="end-icon" viewBox="0 0 1 1"></svg>';
const scenes: ReadonlyArray<readonly [string, string]> = [
  ['plain', 'New'],
  ['icons', icons],
];

for (const variant of BADGE_VARIANTS) {
  for (const [label, children] of scenes) {
    test(`badge.element variant=${variant} ${label}`, async ({ task }) => {
      document.body.innerHTML = `<main><rafters-badge variant="${variant}">${children}</rafters-badge></main>`;
      const results = await runAxe(document.body);
      task.meta.axe = results;
      expect(results.violations).toEqual([]);
    });
  }
}
