import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Container from '../../../src/components/container/container.astro';

type Props = Record<string, unknown>;

/** One server-rendered Container; nested scenes pass a rendered child as the slot. */
async function part(astro: AstroContainer, props: Props, slot: string): Promise<string> {
  return astro.renderToString(Container, { props, slots: { default: slot } });
}

interface Scene {
  build: (astro: AstroContainer) => Promise<string>;
  /** The scene's own root is a page landmark (main, header, footer), so it
   *  mounts in a plain div: wrapping it in another <main> would nest landmarks. */
  landmark?: boolean;
}

async function mount({ build, landmark = false }: Scene): Promise<Document> {
  const astro = await AstroContainer.create();
  const html = await build(astro);
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = landmark ? `<div>${html}</div>` : `<main>${html}</main>`;
  // Container is a pure static: no bindContainer exists, so nothing to hydrate.
  return document;
}

const scenes: ReadonlyArray<[string, Scene]> = [
  [
    'main landmark',
    {
      landmark: true,
      build: (astro) => part(astro, { as: 'main', size: '6xl' }, '<h1>Title</h1><p>Prose.</p>'),
    },
  ],
  [
    'page landmarks',
    {
      landmark: true,
      build: async (astro) => {
        const article = await part(astro, { as: 'article' }, '<h1>Title</h1><p>Prose.</p>');
        const aside = await part(astro, { as: 'aside', 'aria-label': 'Related' }, 'rail');
        const header = await part(astro, { as: 'header' }, 'head');
        const main = await part(astro, { as: 'main', size: '6xl' }, article + aside);
        const footer = await part(astro, { as: 'footer' }, 'foot');
        return header + main + footer;
      },
    },
  ],
  [
    'sticky header with navigation',
    {
      landmark: true,
      build: (astro) =>
        part(
          astro,
          {
            as: 'header',
            position: 'sticky',
            depth: 'navigation',
            fill: 'background',
            size: 'full',
            padding: '4',
          },
          '<nav aria-label="Site"><a href="/">Home</a></nav>',
        ),
    },
  ],
  [
    'section grid with self-placed children',
    {
      build: async (astro) => {
        const main = await part(astro, { colSpan: 2 }, 'main');
        const rail = await part(astro, { colSpan: 1 }, 'rail');
        return part(
          astro,
          { as: 'section', size: '6xl', columns: 3, gap: '6', 'aria-label': 'Layout' },
          main + rail,
        );
      },
    },
  ],
  ['named query provider', { build: (astro) => part(astro, { queryName: 'rail' }, 'Rail') }],
  [
    'article',
    {
      build: (astro) =>
        part(astro, { as: 'article', padding: '6' }, '<h2>Heading</h2><p>Prose.</p>'),
    },
  ],
];

for (const [name, scene] of scenes) {
  test(`container.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
