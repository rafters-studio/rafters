import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { Card } from '../../../src/components/card/card';
import { cardClasses } from '../../../src/components/card/card.classes';
import * as Named from '../../../src/components/typography/typography';
import {
  Blockquote,
  Code,
  CodeBlock,
  H1,
  H2,
  H5,
  Li,
  Small,
  Typography,
  Ul,
  P,
  resolveTypography,
} from '../../../src/components/typography/typography';
import type { TypographyVariant } from '../../../src/components/typography/typography.behavior';

/** Name -> variant, the same table the Astro spec renders against resolveTypography. */
const NAMED: Array<[keyof typeof Named, TypographyVariant]> = [
  ['H1', 'h1'],
  ['H2', 'h2'],
  ['H3', 'h3'],
  ['H4', 'h4'],
  ['H5', 'h4'],
  ['H6', 'h4'],
  ['P', 'p'],
  ['Lead', 'lead'],
  ['Large', 'large'],
  ['Muted', 'muted'],
  ['Small', 'small'],
  ['Code', 'code'],
  ['CodeBlock', 'codeblock'],
  ['Blockquote', 'blockquote'],
  ['Mark', 'mark'],
  ['Abbr', 'abbr'],
  ['Ul', 'ul'],
  ['Ol', 'ol'],
  ['Li', 'li'],
  ['List', 'ul'],
];

declare module 'vitest/browser' {
  interface BrowserCommands {
    compileCss: (classes: string) => Promise<string>;
  }
}

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('typography [react]', () => {
  it('the semantic element IS the contract: each variant renders its tag with data-part root', () => {
    render(
      <main>
        <H1>Title</H1>
        <P>Body prose.</P>
        <Blockquote>Quoted.</Blockquote>
        <P>
          Inline <Code>useState</Code> and <Small>small print</Small>.
        </P>
        <Ul>
          <Li>one</Li>
          <Li>two</Li>
        </Ul>
      </main>,
    );
    const h1 = body().querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.getAttribute('data-part')).toBe('root');
    expect(h1?.className).toContain('text-4xl');
    expect(body().querySelector('blockquote')).not.toBeNull();
    expect(body().querySelector('code')?.className).toContain('font-mono');
    expect(body().querySelector('small')).not.toBeNull();
    expect(body().querySelectorAll('ul > li').length).toBe(2);
  });

  it('codeblock nests a code element inside the pre root', () => {
    render(
      <main>
        <CodeBlock>const x = 1;</CodeBlock>
      </main>,
    );
    const pre = body().querySelector('pre');
    expect(pre?.getAttribute('data-part')).toBe('root');
    expect(pre?.querySelector('code')?.textContent).toBe('const x = 1;');
  });

  it('h5/h6 render their own tag but borrow h4 scale', () => {
    render(
      <main>
        <H5>Sub</H5>
      </main>,
    );
    const h5 = body().querySelector('h5');
    expect(h5).not.toBeNull();
    expect(h5?.className).toContain('text-xl');
  });

  it('token props override the variant default at the tag', () => {
    render(
      <main>
        <P size="xl" data-testid="lead">
          intro
        </P>
      </main>,
    );
    const p = body().querySelector('[data-testid="lead"]') as HTMLElement;
    expect(p.className).toContain('text-xl');
    // P's leading-7 default survives -- size is a different dimension.
    expect(p.className).toContain('leading-7');
  });

  it('the generic wrapper derives the variant from as, variant overrides it', () => {
    render(
      <main>
        <Typography as="h2" data-testid="a">
          heading
        </Typography>
        <Typography as="span" data-testid="b">
          body
        </Typography>
        <Typography as="h5" data-testid="c">
          borrowed
        </Typography>
        <Typography as="p" variant="lead" data-testid="d">
          override
        </Typography>
      </main>,
    );
    const a = body().querySelector('[data-testid="a"]') as HTMLElement;
    const b = body().querySelector('[data-testid="b"]') as HTMLElement;
    const c = body().querySelector('[data-testid="c"]') as HTMLElement;
    const d = body().querySelector('[data-testid="d"]') as HTMLElement;
    expect(a.tagName.toLowerCase()).toBe('h2');
    expect(a.className).toContain('text-3xl');
    expect(b.tagName.toLowerCase()).toBe('span');
    expect(b.className).toContain('leading-7');
    expect(c.tagName.toLowerCase()).toBe('h5');
    expect(c.className).toContain('text-xl');
    expect(d.tagName.toLowerCase()).toBe('p');
    expect(d.className).toContain('text-xl');
  });

  it('fill resolves on every named export exactly as resolveTypography resolves it', () => {
    for (const [name, variant] of NAMED) {
      const Component = Named[name] as React.ComponentType<Named.TypographyComponentProps>;
      const { container } = render(
        <Component fill="bg-fill-blaze" data-testid={name}>
          x
        </Component>,
      );
      const root = container.querySelector(`[data-testid="${name}"]`) as HTMLElement;
      expect(root.className, name).toBe(resolveTypography(variant, { fill: 'bg-fill-blaze' }));
      expect(root.className.split(' '), name).toContain('bg-fill-blaze');
      cleanup();
    }
    render(
      <Typography as="h2" fill="bg-fill-blaze" data-testid="generic">
        x
      </Typography>,
    );
    const generic = body().querySelector('[data-testid="generic"]') as HTMLElement;
    expect(generic.className).toBe(resolveTypography('h2', { fill: 'bg-fill-blaze' }));
  });

  it('consumer className merges via classy', () => {
    render(
      <main>
        <P className="max-w-prose">x</P>
      </main>,
    );
    const p = body().querySelector('p') as HTMLElement;
    expect(p.className).toContain('leading-7');
    expect(p.className).toContain('max-w-prose');
  });
});

/** The variants that paint no background, so inherit their colour (#2888). */
const INHERITING: readonly TypographyVariant[] = [
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'lead',
  'large',
  'small',
  'blockquote',
  'ul',
  'ol',
  'li',
  'abbr',
];

/**
 * #2888: text inherits its surface's foreground. The test page loads no
 * compiled sheet, so the classes the Card surfaces and the h2 and p emit are
 * compiled server side (test/browser/compile-css.command.ts) and injected.
 */
describe('typography [react] -- inherits the surface foreground (#2888)', () => {
  let sheet: HTMLStyleElement | undefined;

  beforeAll(async () => {
    const classes = [
      cardClasses({}, {}).root,
      cardClasses({ surface: 'primary' }, {}).root,
      ...INHERITING.map((variant) => resolveTypography(variant)),
    ].join(' ');
    sheet = document.createElement('style');
    sheet.textContent = await commands.compileCss(classes);
    document.head.append(sheet);
  }, 30000);

  afterAll(() => {
    sheet?.remove();
  });

  it.each([
    ['a Card', undefined],
    ['a surface="primary" Card', 'primary'],
  ])('an h2 and a p inside %s compute the surface foreground', (_, surface) => {
    render(
      <Card surface={surface} data-testid="surface">
        <H2>Heading</H2>
        <P>Body</P>
      </Card>,
    );
    const root = body().querySelector('[data-testid="surface"]') as HTMLElement;
    const foreground = getComputedStyle(root).color;
    expect(getComputedStyle(root).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    for (const tag of ['h2', 'p']) {
      const el = root.querySelector(tag) as HTMLElement;
      expect(getComputedStyle(el).color, tag).toBe(foreground);
    }
  });

  const SURFACES = [
    ['a Card', undefined],
    ['a surface="primary" Card', 'primary'],
  ] as const;

  it.each(SURFACES)('every inheriting variant inside %s computes its foreground', (_, surface) => {
    for (const [name, variant] of NAMED) {
      if (!INHERITING.includes(variant)) continue;
      const Component = Named[name] as React.ComponentType<Named.TypographyComponentProps>;
      const { container } = render(
        <Card surface={surface} data-testid="surface">
          <Component data-testid={name}>x</Component>
        </Card>,
      );
      const card = container.querySelector('[data-testid="surface"]') as HTMLElement;
      const el = container.querySelector(`[data-testid="${name}"]`) as HTMLElement;
      expect.soft(getComputedStyle(el).color, name).toBe(getComputedStyle(card).color);
      cleanup();
    }
  });

  it.each(SURFACES)('bare native copy inside %s computes its foreground', (_, surface) => {
    render(
      <Card surface={surface} data-testid="surface">
        <h2>Heading</h2>
        <p>Body</p>
        <ul>
          <li>one</li>
        </ul>
        <ol>
          <li>two</li>
        </ol>
        <blockquote>Quoted</blockquote>
      </Card>,
    );
    const card = body().querySelector('[data-testid="surface"]') as HTMLElement;
    const foreground = getComputedStyle(card).color;
    for (const el of card.querySelectorAll('h2, p, ul, ol, li, blockquote')) {
      expect(getComputedStyle(el).color, el.tagName).toBe(foreground);
    }
  });
});
