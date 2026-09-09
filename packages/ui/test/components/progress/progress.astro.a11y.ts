import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Progress from '../../../src/components/progress/progress.astro';
import {
  bindProgress,
  type ProgressSize,
  type ProgressVariant,
} from '../../../src/components/progress/progress.behavior';

const VARIANTS: ReadonlyArray<ProgressVariant> = [
  'default',
  'primary',
  'secondary',
  'destructive',
  'success',
  'warning',
  'info',
  'accent',
];
const SIZES: ReadonlyArray<ProgressSize> = ['sm', 'default', 'lg'];

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Progress, { props });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindProgress(document.querySelector('[data-part="root"][data-progress]') as HTMLElement);
  return document;
}

// A progressbar needs an accessible name; every scene supplies one.
const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  ['determinate', { value: 66, 'aria-label': 'Upload progress' }],
  ['indeterminate', { 'aria-label': 'Loading' }],
  ['empty', { value: 0, 'aria-label': 'Upload progress' }],
  ['complete', { value: 100, 'aria-label': 'Upload progress' }],
  [
    'custom max with a value label',
    { value: 3, max: 10, valueText: '3 of 10 files', 'aria-label': 'Files' },
  ],
  ...VARIANTS.map((variant): [string, Record<string, unknown>] => [
    `variant=${variant}`,
    { value: 40, variant, 'aria-label': 'Upload progress' },
  ]),
  ...SIZES.map((size): [string, Record<string, unknown>] => [
    `size=${size}`,
    { value: 40, size, 'aria-label': 'Upload progress' },
  ]),
];

for (const [name, props] of scenes) {
  test(`progress.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
