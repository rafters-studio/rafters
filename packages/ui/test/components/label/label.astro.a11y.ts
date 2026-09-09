import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Label from '../../../src/components/label/label.astro';
import type { LabelVariant } from '../../../src/components/label/label.behavior';
import { labelVariantClasses } from '../../../src/components/label/label.classes';

const VARIANTS = Object.keys(labelVariantClasses) as LabelVariant[];

async function mount(props: Record<string, unknown>, slot: string, after = ''): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Label, { props, slots: { default: slot } });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}${after}</main>`;
  // Label is a pure static: no bindLabel exists, so nothing to hydrate.
  return document;
}

// Every scene pairs the label with a control: by the native `for` IDREF to a
// sibling input, or by wrapping the control in the slot.
for (const variant of VARIANTS) {
  test(`label.astro variant=${variant} associated by for`, async ({ task }) => {
    const document = await mount(
      { for: 'email', variant },
      'Email address',
      '<input id="email" type="email" />',
    );
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('label.astro wrapping its control', async ({ task }) => {
  const document = await mount({}, 'Email address <input type="email" name="email" />');
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
