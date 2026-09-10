import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Editor } from '../../../src/components/editor/editor';
import type { BaseBlock } from '../../../src/primitives/types';

const seededDoc: BaseBlock[] = [{ id: 'b1', type: 'text', content: 'hello' }];

// The editor is one contenteditable root with role=textbox; its accessible
// name (label or labelledBy) is the whole ARIA contract, so the scenes cover
// both naming routes and every contenteditable state the conformance tests set up.
const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  ['empty with a label', () => <Editor label="Document" />],
  ['with seeded content', () => <Editor label="Document" initialDocument={seededDoc} />],
  [
    'labelled by a heading',
    () => (
      <div>
        <h2 id="editor-heading">Notes</h2>
        <Editor labelledBy="editor-heading" initialDocument={seededDoc} />
      </div>
    ),
  ],
  ['disabled', () => <Editor label="Document" initialDocument={seededDoc} disabled />],
  ['read-only', () => <Editor label="Document" initialDocument={seededDoc} readonly />],
];

for (const [name, build] of scenes) {
  test(`editor ${name}`, async ({ task }) => {
    const { container } = await render(build());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
