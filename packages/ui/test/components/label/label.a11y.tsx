import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Label } from '../../../src/components/label/label';
import type { LabelVariant } from '../../../src/components/label/label.behavior';
import { labelVariantClasses } from '../../../src/components/label/label.classes';

const VARIANTS = Object.keys(labelVariantClasses) as LabelVariant[];

// A label is only meaningful with a control: every scene pairs it with one,
// through the native `htmlFor` IDREF or by wrapping the control.
for (const variant of VARIANTS) {
  test(`label variant=${variant} associated by htmlFor`, async ({ task }) => {
    const { container } = await render(
      <div>
        <Label htmlFor="email" variant={variant}>
          Email address
        </Label>
        <input id="email" type="email" />
      </div>,
    );
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('label wrapping its control', async ({ task }) => {
  const { container } = await render(
    <Label>
      Email address <input type="email" name="email" />
    </Label>,
  );
  const results = await runAxe(container);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
