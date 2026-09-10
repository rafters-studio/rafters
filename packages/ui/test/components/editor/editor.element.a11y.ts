import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/editor/editor.element';

const SEED =
  `data-initial-doc='[{"id":"b1","type":"text","content":"hello"}]' ` +
  `data-caret='{"blockId":"b1","offset":5}'`;

interface Scene {
  attrs: string;
  seed?: boolean;
  /** Markup placed before the editor, e.g. the heading a labelledby points at. */
  before?: string;
}

async function mount({ attrs, seed = true, before = '' }: Scene): Promise<HTMLElement> {
  document.body.innerHTML = `
    <main>
      ${before}
      <rafters-editor id="e1" ${attrs} ${seed ? SEED : ''}></rafters-editor>
    </main>`;
  await Promise.resolve(); // connectedCallback defers its bind one microtask
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['empty with a label', { attrs: 'data-label="Document"', seed: false }],
  ['with seeded content', { attrs: 'data-label="Document"' }],
  [
    'labelled by a heading',
    {
      attrs: 'data-labelledby="editor-heading"',
      before: '<h2 id="editor-heading">Notes</h2>',
    },
  ],
  ['disabled', { attrs: 'data-label="Document" data-disabled="true"' }],
  ['read-only', { attrs: 'data-label="Document" data-readonly="true"' }],
];

for (const [name, scene] of scenes) {
  test(`rafters-editor ${name}`, async ({ task }) => {
    const host = await mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
