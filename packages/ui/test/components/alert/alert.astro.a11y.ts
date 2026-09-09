import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Alert from '../../../src/components/alert/alert.astro';
import type { AlertVariant } from '../../../src/components/alert/alert.behavior';

const VARIANTS: ReadonlyArray<AlertVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'muted',
  'accent',
];

async function mount(
  props: Record<string, unknown>,
  slots: Record<string, string>,
): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Alert, { props, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // Alert is a pure static: no bindAlert exists, so nothing to hydrate.
  return document;
}

const titled = { title: 'Saved', description: 'Your changes were saved.' };

for (const variant of VARIANTS) {
  test(`alert.astro variant=${variant}`, async ({ task }) => {
    const document = await mount({ variant }, titled);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}

test('alert.astro text only', async ({ task }) => {
  const document = await mount({}, { default: 'Saved.' });
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('alert.astro every region empty', async ({ task }) => {
  const document = await mount({}, {});
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('alert.astro with title, description, and an action control', async ({ task }) => {
  const document = await mount(
    { variant: 'success' },
    { ...titled, action: '<button type="button">Undo</button>' },
  );
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});

test('alert.astro with a decorative icon', async ({ task }) => {
  const document = await mount(
    { variant: 'destructive' },
    {
      ...titled,
      default:
        '<svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle></svg>',
    },
  );
  const results = await runAxe(document.body);
  task.meta.axe = results;
  expect(results.violations).toEqual([]);
});
