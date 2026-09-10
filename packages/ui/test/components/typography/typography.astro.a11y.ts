import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Typography from '../../../src/components/typography/typography.astro';

interface Piece {
  props: Record<string, unknown>;
  slot: string;
}

/** Renders each piece through the Container and composes them into one page. */
async function mount(pieces: ReadonlyArray<Piece>): Promise<Document> {
  const container = await AstroContainer.create();
  const parts: string[] = [];
  for (const { props, slot } of pieces) {
    parts.push(await container.renderToString(Typography, { props, slots: { default: slot } }));
  }
  const window = new Window();
  const document = window.document as unknown as Document;
  // Bare text is not landmark content; the page around it supplies the region.
  document.body.innerHTML = `<main>${parts.join('')}</main>`;
  // Typography is a pure static: no bindTypography exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, ReadonlyArray<Piece>]> = [
  [
    'heading hierarchy',
    [
      { props: { as: 'h1' }, slot: 'Doc title' },
      { props: { as: 'h2' }, slot: 'Section' },
      { props: { as: 'h3' }, slot: 'Subsection' },
    ],
  ],
  [
    'heading and prose set',
    [
      { props: { as: 'h1' }, slot: 'Doc title' },
      { props: { as: 'p', variant: 'lead' }, slot: 'An introduction.' },
      { props: { as: 'p' }, slot: 'Body.' },
      { props: { as: 'p', variant: 'muted' }, slot: 'Last updated: Jan 2025' },
    ],
  ],
  [
    'h5 borrows the h4 scale',
    [
      { props: { as: 'h1' }, slot: 'Doc title' },
      { props: { as: 'h2' }, slot: 'Section' },
      { props: { as: 'h3' }, slot: 'Subsection' },
      { props: { as: 'h4' }, slot: 'Topic' },
      { props: { as: 'h5' }, slot: 'Sub' },
    ],
  ],
  ['blockquote', [{ props: { as: 'blockquote' }, slot: 'Design is how it works.' }]],
  [
    'inline code, small and span',
    [
      { props: { as: 'p' }, slot: 'Inline' },
      { props: { as: 'code' }, slot: 'useState' },
      { props: { as: 'small' }, slot: 'small print' },
      { props: { as: 'span' }, slot: 'inline body' },
    ],
  ],
  [
    'token props override the variant default',
    [{ props: { as: 'h1', size: '2xl' }, slot: 'Title' }],
  ],
  [
    'mark',
    [
      { props: { as: 'p' }, slot: 'Body' },
      { props: { as: 'mark' }, slot: 'marked' },
    ],
  ],
];

for (const [name, pieces] of scenes) {
  test(`typography.astro ${name}`, async ({ task }) => {
    const document = await mount(pieces);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
