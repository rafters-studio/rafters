import type { ReactElement } from 'react';
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';
import { runAxe } from '../../a11y/run-axe';
import {
  Abbr,
  Blockquote,
  Code,
  CodeBlock,
  H1,
  H2,
  H3,
  H4,
  H5,
  Large,
  Lead,
  Li,
  Mark,
  Muted,
  Ol,
  P,
  Small,
  Typography,
  Ul,
} from '../../../src/components/typography/typography';

/** Bare text is not landmark content; every scene sits inside a <main>. */
const scenes: ReadonlyArray<[string, () => ReactElement]> = [
  [
    'heading hierarchy',
    () => (
      <main>
        <H1>Doc title</H1>
        <H2>Section</H2>
        <H3>Subsection</H3>
      </main>
    ),
  ],
  [
    'heading and prose set',
    () => (
      <main>
        <H1>Doc title</H1>
        <Lead>An introduction to the page.</Lead>
        <P>First paragraph.</P>
        <Large>A larger callout.</Large>
        <Muted>Last updated: Jan 2025</Muted>
      </main>
    ),
  ],
  [
    'h5 borrows the h4 scale',
    () => (
      <main>
        <H1>Doc title</H1>
        <H2>Section</H2>
        <H3>Subsection</H3>
        <H4>Topic</H4>
        <H5>Sub</H5>
      </main>
    ),
  ],
  [
    'blockquote',
    () => (
      <main>
        <Blockquote>Design is how it works.</Blockquote>
      </main>
    ),
  ],
  [
    'inline code, small, mark and abbr',
    () => (
      <main>
        <P>
          Inline <Code>useState</Code>, <Small>small print</Small>, <Mark>marked</Mark> and{' '}
          <Abbr title="HyperText Markup Language">HTML</Abbr>.
        </P>
      </main>
    ),
  ],
  [
    'unordered and ordered lists',
    () => (
      <main>
        <Ul>
          <Li>one</Li>
          <Li>two</Li>
        </Ul>
        <Ol>
          <Li>first</Li>
          <Li>second</Li>
        </Ol>
      </main>
    ),
  ],
  [
    'code block',
    () => (
      <main>
        <CodeBlock>const x = 1;</CodeBlock>
      </main>
    ),
  ],
  [
    'token props override the variant default',
    () => (
      <main>
        <P size="xl">intro</P>
        <P size="sm" color="muted">
          fine print
        </P>
      </main>
    ),
  ],
  [
    'generic wrapper derives the variant from as',
    () => (
      <main>
        <Typography as="h2">heading</Typography>
        <Typography as="span">body</Typography>
        <Typography as="p" variant="lead">
          override
        </Typography>
      </main>
    ),
  ],
];

for (const [name, element] of scenes) {
  test(`typography ${name}`, async ({ task }) => {
    const { container } = await render(element());
    const results = await runAxe(container);
    task.meta.axe = results;
    expect(results.violations).toEqual([]);
  });
}
