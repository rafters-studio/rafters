import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import { Container } from '../../../src/components/container/container';

// Container is a pure static: the `as` element IS the landmark, so every scene
// is a real page fragment built from the semantic elements the score names.
const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  [
    'main landmark',
    () => (
      <Container as="main" size="6xl">
        <h1>Title</h1>
        <p>Prose.</p>
      </Container>
    ),
  ],
  [
    'page landmarks',
    () => (
      <div>
        <Container as="header">head</Container>
        <Container as="main" size="6xl">
          <Container as="article">
            <h1>Title</h1>
            <p>Prose.</p>
          </Container>
          <Container as="aside" aria-label="Related">
            rail
          </Container>
        </Container>
        <Container as="footer">foot</Container>
      </div>
    ),
  ],
  [
    'sticky header with navigation',
    () => (
      <Container
        as="header"
        position="sticky"
        depth="navigation"
        fill="background"
        size="full"
        padding="4"
      >
        <nav aria-label="Site">
          <a href="/">Home</a>
        </nav>
      </Container>
    ),
  ],
  [
    'section grid with self-placed children',
    () => (
      <Container as="section" size="6xl" columns={3} gap="6" aria-label="Layout">
        <Container colSpan={2}>main</Container>
        <Container colSpan={1}>rail</Container>
      </Container>
    ),
  ],
  ['named query provider', () => <Container queryName="rail">Rail</Container>],
  [
    'article',
    () => (
      <Container as="article" padding="6">
        <h2>Heading</h2>
        <p>Prose.</p>
      </Container>
    ),
  ],
];

for (const [name, build] of scenes) {
  test(`container ${name}`, async ({ task }) => {
    const { container } = await render(build());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
