import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { ALERT_VARIANTS } from '../../../src/components/alert/alert.behavior';
import '../../../src/components/alert/alert.element';

for (const variant of ALERT_VARIANTS) {
  test(`alert.element variant=${variant}`, async ({ task }) => {
    document.body.innerHTML =
      `<main><rafters-alert variant="${variant}"><span slot="title">Heads up</span>` +
      '<span slot="description">Disk almost full</span></rafters-alert></main>';
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
