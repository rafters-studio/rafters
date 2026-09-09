import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Spinner from '../../../src/components/spinner/spinner.astro';
import type { SpinnerSize, SpinnerVariant } from '../../../src/components/spinner/spinner.behavior';

// The score projects aria-label="Loading" on every instance, so there is no
// unlabelled form; sizes and variants are the states that vary.
const SIZES: ReadonlyArray<SpinnerSize> = ['sm', 'default', 'lg'];
const VARIANTS: ReadonlyArray<SpinnerVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
  'muted',
];

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Spinner, { props });
  const window = new Window();
  const document = window.document as unknown as Document;
  // A spinner is inline content, not a landmark; the page supplies the landmark.
  document.body.innerHTML = `<main>${html}</main>`;
  // Spinner is a pure static: no bindSpinner exists, so nothing to hydrate.
  return document;
}

for (const size of SIZES) {
  test(`spinner.astro size=${size}`, async ({ task }) => {
    const document = await mount({ size });
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

for (const variant of VARIANTS) {
  test(`spinner.astro variant=${variant}`, async ({ task }) => {
    const document = await mount({ variant });
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
