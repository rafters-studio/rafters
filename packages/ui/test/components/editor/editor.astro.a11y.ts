import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import { decodeHtmlEntities } from '../../a11y/decode-html-entities';
import Editor from '../../../src/components/editor/editor.astro';
import { bindEditor } from '../../../src/components/editor/editor.behavior';
import type { BaseBlock } from '../../../src/primitives/types';

const seededDoc: BaseBlock[] = [{ id: 'b1', type: 'text', content: 'hello' }];

interface Scene {
  props: Record<string, unknown>;
  /** Run the page <script>'s job (bindEditor) after parsing. */
  bind?: boolean;
  /** Markup placed before the editor, e.g. the heading a labelledBy points at. */
  before?: string;
}

async function mount({ props, bind = false, before = '' }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Editor, {
    props: { id: 'e1', initialDoc: seededDoc, caret: { blockId: 'b1', offset: 5 }, ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${before}${html}</main>`;
  const root = document.querySelector('rafters-editor') as HTMLElement;
  // Astro entity-encodes the JSON quotes in data-initial-doc and data-caret;
  // decode those two attributes after parsing, as the astro conformance test
  // does, before the bind reads them.
  for (const attr of ['data-initial-doc', 'data-caret']) {
    const raw = root.getAttribute(attr);
    if (raw !== null) root.setAttribute(attr, decodeHtmlEntities(raw));
  }
  // The page <script> does this per instance; the Container never runs it.
  if (bind) bindEditor(root);
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['SSR empty with a label', { props: { label: 'Document', initialDoc: [], caret: undefined } }],
  ['SSR with seeded content, pre-bind', { props: { label: 'Document' } }],
  ['bound with seeded content', { props: { label: 'Document' }, bind: true }],
  [
    'labelled by a heading',
    {
      props: { labelledBy: 'editor-heading' },
      bind: true,
      before: '<h2 id="editor-heading">Notes</h2>',
    },
  ],
  ['disabled', { props: { label: 'Document', disabled: true }, bind: true }],
  ['read-only', { props: { label: 'Document', readonly: true }, bind: true }],
];

for (const [name, scene] of scenes) {
  test(`editor.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
