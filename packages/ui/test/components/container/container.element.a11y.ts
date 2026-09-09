import { expect, test } from 'vitest';
import { runAxe } from '../../a11y/run-axe';
import '../../../src/components/container/container.element';

interface Scene {
  markup: string;
  /** The scene's own root is a page landmark (main, header, footer), so it
   *  mounts in a plain div: wrapping it in another <main> would nest landmarks. */
  landmark?: boolean;
}

function mount({ markup, landmark = false }: Scene): HTMLElement {
  document.body.innerHTML = landmark ? `<div>${markup}</div>` : `<main>${markup}</main>`;
  return document.body.firstElementChild as HTMLElement;
}

// The element renders the `as` landmark inside its shadow root and the host is
// display:contents, so the audited box is the shadow landmark, not the host.
const scenes: ReadonlyArray<[string, Scene]> = [
  [
    'main landmark',
    {
      landmark: true,
      markup: `<rafters-container as="main" size="6xl"><h1>Title</h1><p>Prose.</p></rafters-container>`,
    },
  ],
  [
    'page landmarks',
    {
      landmark: true,
      markup: `
        <rafters-container as="header">head</rafters-container>
        <rafters-container as="main" size="6xl">
          <rafters-container as="article"><h1>Title</h1><p>Prose.</p></rafters-container>
          <rafters-container as="aside">rail</rafters-container>
        </rafters-container>
        <rafters-container as="footer">foot</rafters-container>`,
    },
  ],
  [
    'sticky header with navigation',
    {
      landmark: true,
      markup: `<rafters-container as="header" position="sticky" depth="navigation" fill="background" size="full" padding="4"><nav aria-label="Site"><a href="/">Home</a></nav></rafters-container>`,
    },
  ],
  [
    'section grid with self-placed children',
    {
      markup: `
        <rafters-container as="section" size="6xl" columns="3" gap="6">
          <rafters-container col-span="2">main</rafters-container>
          <rafters-container col-span="1">rail</rafters-container>
        </rafters-container>`,
    },
  ],
  [
    'named query provider',
    { markup: `<rafters-container query-name="rail">Rail</rafters-container>` },
  ],
  [
    'article',
    {
      markup: `<rafters-container as="article" padding="6"><h2>Heading</h2><p>Prose.</p></rafters-container>`,
    },
  ],
];

for (const [name, scene] of scenes) {
  test(`rafters-container ${name}`, async ({ task }) => {
    const host = mount(scene);
    const results = await runAxe(host);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
