import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import InputGroup from '../../../src/components/input-group/input-group.astro';
import { bindInputGroup } from '../../../src/components/input-group/input-group.behavior';

interface Scene {
  props?: Record<string, unknown>;
  slots?: Record<string, string>;
}

async function mount({ props = {}, slots = {} }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(InputGroup, {
    props: { id: 'amount', 'aria-label': 'Amount', ...props },
    slots,
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindInputGroup(document.querySelector('rafters-input-group[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  ['both affixes', { slots: { start: '$', end: 'USD' } }],
  ['start affix only', { slots: { start: '$' } }],
  ['no affixes', {}],
  ['invalid', { props: { invalid: true }, slots: { start: '$' } }],
  ['disabled', { props: { disabled: true }, slots: { start: '$' } }],
  ['size sm', { props: { size: 'sm' }, slots: { start: '$' } }],
  [
    'size lg with an email control',
    {
      props: {
        size: 'lg',
        type: 'email',
        name: 'email',
        placeholder: 'you@x.com',
        'aria-label': 'Email',
      },
    },
  ],
  ['action button affix', { slots: { end: '<button type="button">Apply</button>' } }],
];

for (const [name, scene] of scenes) {
  test(`input-group.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
