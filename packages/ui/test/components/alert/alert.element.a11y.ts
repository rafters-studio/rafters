import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/alert/alert.element';
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

interface Scene {
  attrs: string;
  slots: string;
}

function mount({ attrs, slots }: Scene): HTMLElement {
  document.body.innerHTML = `<main><rafters-alert ${attrs}>${slots}</rafters-alert></main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const titled =
  '<span slot="title">Saved</span><span slot="description">Your changes were saved.</span>';

const scenes: ReadonlyArray<[string, Scene]> = [
  ...VARIANTS.map((variant): [string, Scene] => [
    `variant=${variant}`,
    { attrs: `variant="${variant}"`, slots: titled },
  ]),
  ['text only', { attrs: '', slots: 'Saved.' }],
  ['every region empty', { attrs: '', slots: '' }],
  [
    'with title, description, and an action control',
    {
      attrs: 'variant="success"',
      slots: `${titled}<button slot="action" type="button">Undo</button>`,
    },
  ],
  [
    'with a decorative icon',
    {
      attrs: 'variant="destructive"',
      slots: `<svg aria-hidden="true" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7"></circle></svg>${titled}`,
    },
  ],
];

for (const [name, scene] of scenes) {
  test(`rafters-alert ${name}`, async ({ task }) => {
    const host = mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
