import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/typography/typography.element';

/**
 * Typography is a shadow-rendering static: the markup is just the tag with
 * its attributes and slotted text, as the element conformance test mounts it.
 * Bare text is not landmark content, so every scene sits inside a <main>.
 */
function mount(inner: string): HTMLElement {
  document.body.innerHTML = `<main>${inner}</main>`;
  return document.body.querySelector('main') as HTMLElement;
}

const scenes: ReadonlyArray<[string, string]> = [
  [
    'heading hierarchy',
    '<rafters-typography variant="h1">Doc title</rafters-typography><rafters-typography variant="h2">Section</rafters-typography><rafters-typography variant="h3">Subsection</rafters-typography>',
  ],
  [
    'heading and prose set',
    '<rafters-typography variant="h1">Doc title</rafters-typography><rafters-typography variant="lead">An introduction.</rafters-typography><rafters-typography variant="p">Body.</rafters-typography><rafters-typography variant="muted">Last updated: Jan 2025</rafters-typography>',
  ],
  [
    'blockquote',
    '<rafters-typography variant="blockquote">Design is how it works.</rafters-typography>',
  ],
  [
    'inline code and small',
    '<rafters-typography variant="p">Inline <rafters-typography variant="code">useState</rafters-typography> and <rafters-typography variant="small">small print</rafters-typography>.</rafters-typography>',
  ],
  ['code block', '<rafters-typography variant="codeblock">const x = 1;</rafters-typography>'],
  [
    'token props override the variant default',
    '<rafters-typography variant="h1" size="2xl">Title</rafters-typography><rafters-typography variant="p" size="sm">fine print</rafters-typography>',
  ],
  [
    'unknown variant falls back to p',
    '<rafters-typography variant="display">body</rafters-typography>',
  ],
];

for (const [name, inner] of scenes) {
  test(`rafters-typography ${name}`, async ({ task }) => {
    const host = mount(inner);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
