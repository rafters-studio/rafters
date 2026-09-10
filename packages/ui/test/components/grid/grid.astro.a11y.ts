import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Grid from '../../../src/components/grid/grid.astro';
import { bindGrid } from '../../../src/components/grid/grid.behavior';

interface Scene {
  props: Record<string, unknown>;
  slots?: Record<string, string>;
}

async function mount({ props, slots = {} }: Scene): Promise<Document> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Grid, { props: { id: 'g', ...props }, slots });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindGrid(document.querySelector('[data-part="root"][data-grid]') as HTMLElement);
  return document;
}

const cells = [{ html: 'a' }, { html: 'b' }, { html: 'c' }, { html: 'd' }];

const scenes: ReadonlyArray<[string, Scene]> = [
  [
    'presentation bento dashboard',
    {
      props: { preset: 'bento', pattern: 'dashboard' },
      slots: { default: '<div>Metric</div><div>Chart</div><div>Feed</div>' },
    },
  ],
  [
    'presentation linear with gap and padding',
    {
      props: { preset: 'linear', columns: 3, gap: '4', padding: '2' },
      slots: { default: '<div>One</div><div>Two</div><div>Three</div>' },
    },
  ],
  ['role=grid with text cells', { props: { role: 'grid', columns: 2, ariaLabel: 'Cells', cells } }],
  [
    'role=grid with button cells',
    {
      props: {
        role: 'grid',
        columns: 2,
        ariaLabel: 'Photo picker',
        cells: [
          { html: '<button type="button">One</button>' },
          { html: '<button type="button">Two</button>' },
          { html: '<button type="button">Three</button>' },
        ],
      },
    },
  ],
];

for (const [name, scene] of scenes) {
  test(`grid.astro ${name}`, async ({ task }) => {
    const document = await mount(scene);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
