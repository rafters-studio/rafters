import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { Window } from 'happy-dom';
import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import Resizable from '../../../src/components/resizable/resizable.astro';
import { bindResizable } from '../../../src/components/resizable/resizable.behavior';

async function mount(props: Record<string, unknown>): Promise<Document> {
  const container = await AstroContainer.create();
  // A separator has no intrinsic text; handleLabel names every handle.
  const html = await container.renderToString(Resizable, {
    props: { id: 'r', handleLabel: 'Resize section', ...props },
  });
  const window = new Window();
  const document = window.document as unknown as Document;
  document.body.innerHTML = `<main>${html}</main>`;
  // The page <script> does this per instance; the Container never runs it.
  bindResizable(document.querySelector('[data-part="root"]') as HTMLElement);
  return document;
}

const scenes: ReadonlyArray<[string, Record<string, unknown>]> = [
  [
    'two panels horizontal',
    {
      panels: [
        { defaultSize: 50, content: 'Panel 1' },
        { defaultSize: 50, content: 'Panel 2' },
      ],
    },
  ],
  [
    'three panels with a grip',
    {
      withHandle: true,
      panels: [
        { defaultSize: 25, content: 'Panel 1' },
        { defaultSize: 50, content: 'Panel 2' },
        { defaultSize: 25, content: 'Panel 3' },
      ],
    },
  ],
  [
    'vertical split',
    {
      direction: 'vertical',
      panels: [
        { defaultSize: 40, content: 'Panel 1' },
        { defaultSize: 60, content: 'Panel 2' },
      ],
    },
  ],
  [
    'bounded panels',
    {
      panels: [
        { defaultSize: 30, minSize: 20, maxSize: 60, content: 'Panel 1' },
        { defaultSize: 70, minSize: 40, maxSize: 80, content: 'Panel 2' },
      ],
    },
  ],
  [
    'disabled',
    {
      disabled: true,
      panels: [
        { defaultSize: 50, content: 'Panel 1' },
        { defaultSize: 50, content: 'Panel 2' },
      ],
    },
  ],
];

for (const [name, props] of scenes) {
  test(`resizable.astro ${name}`, async ({ task }) => {
    const document = await mount(props);
    const results = await runAxe(document.body);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
