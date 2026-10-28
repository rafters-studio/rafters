import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { Card } from '../../../src/components/card/card';
import { cardClasses } from '../../../src/components/card/card.classes';
import { Container } from '../../../src/components/container/container';
import { containerClasses } from '../../../src/components/container/container.classes';
import type { TypographyVariant } from '../../../src/components/typography/typography.behavior';
import { resolveTypography } from '../../../src/components/typography/typography.classes';

declare module 'vitest/browser' {
  interface BrowserCommands {
    compileCss: (classes: string) => Promise<string>;
  }
}

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('container [react]', () => {
  // No aria/keymap assertions: Container is a pure static (no behavior file,
  // no data-part="root" ARIA projection) -- structure (the `as` landmark) and
  // classes (queryName, columns, className merge) are the whole surface.
  it('the semantic element IS the contract: as drives the landmark', async () => {
    render(
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
      </div>,
    );
    expect(body().querySelector('main')).not.toBeNull();
    expect(body().querySelector('header')).not.toBeNull();
    expect(body().querySelector('footer')).not.toBeNull();
    expect(body().querySelector('article')).not.toBeNull();
    expect(body().querySelector('aside')?.getAttribute('aria-label')).toBe('Related');
  });

  it('one tag, container and grid: columns puts children on the grid', () => {
    render(
      <Container as="section" size="6xl" columns={3} gap="6" data-testid="combo">
        <Container colSpan={2}>main</Container>
        <Container colSpan={1}>rail</Container>
      </Container>,
    );
    const combo = body().querySelector('[data-testid="combo"]') as HTMLElement;
    expect(combo.className).toContain('grid grid-cols-3');
    expect(combo.className).toContain('max-w-6xl');
    const children = Array.from(combo.children) as HTMLElement[];
    expect(children[0]?.className).toContain('col-span-2');
    expect(children[1]?.className).toContain('col-span-1');
  });

  it('queryName lands as containerName style -- the one style channel', () => {
    render(<Container queryName="rail">x</Container>);
    const element = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(element.style.containerName).toBe('rail');
  });

  it('consumer className merges via classy', () => {
    render(<Container className="min-h-screen">x</Container>);
    const element = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(element.className).toContain('@container');
    expect(element.className).toContain('min-h-screen');
  });
});

/**
 * #2816: article headings read the `foreground` token, not `accent-foreground`.
 * The test page loads no compiled sheet, so the article's own classes plus
 * `text-foreground` (standing in for the body's base colour) are compiled
 * server side and injected; computed colour then reflects the tokens.
 */
describe('container [react] -- article headings read foreground (#2816)', () => {
  let sheet: HTMLStyleElement | undefined;

  beforeAll(async () => {
    const css = await commands.compileCss(
      `${containerClasses({ as: 'article' }, {}).root} text-foreground dark`,
    );
    sheet = document.createElement('style');
    sheet.textContent = css;
    document.head.append(sheet);
  }, 30000);

  afterAll(() => {
    sheet?.remove();
  });

  function colourOf(selector: string): string {
    const element = body().querySelector(selector);
    if (!element) throw new Error(`no ${selector} rendered`);
    return getComputedStyle(element).color;
  }

  it.each([
    ['h1', 'light'],
    ['h2', 'light'],
    ['h3', 'light'],
    ['h4', 'light'],
    ['h1', 'dark'],
  ] as const)('%s in %s mode is the foreground colour of a bare paragraph', (heading, mode) => {
    const Heading = heading;
    render(
      <div>
        <div data-testid="light" className="text-foreground" />
        <div
          data-testid="foreground"
          className={mode === 'dark' ? 'dark text-foreground' : 'text-foreground'}
        >
          <Container as="article">
            <Heading>Title</Heading>
            <p>Prose.</p>
          </Container>
        </div>
      </div>,
    );
    const foreground = colourOf('[data-testid="foreground"]');
    // The dark row must resolve the dark token, not fall through to light.
    if (mode === 'dark') expect(foreground).not.toBe(colourOf('[data-testid="light"]'));
    expect(colourOf(heading)).toBe(foreground);
    expect(colourOf('article p')).toBe(foreground);
  });
});

/**
 * #2889: article prose and Typography are one type system. The article's
 * classes, the Card surfaces and every compared Typography variant are
 * compiled server side and injected, as above.
 */
describe('container [react] -- article prose is Typography type (#2889)', () => {
  let sheet: HTMLStyleElement | undefined;

  /** Each element the article styles, and the Typography variant it matches. */
  const PAIRS: ReadonlyArray<readonly [string, TypographyVariant]> = [
    ['h1', 'h1'],
    ['h2', 'h2'],
    ['h3', 'h3'],
    ['h4', 'h4'],
    ['p', 'p'],
    ['ul', 'ul'],
    ['ol', 'ol'],
    ['li', 'li'],
    ['blockquote', 'blockquote'],
    ['code', 'code'],
    ['pre', 'codeblock'],
  ];

  /** Type, not layout: flow spacing stays the article's own (#2889). */
  const TYPE = [
    'font-size',
    'font-weight',
    'letter-spacing',
    'line-height',
    'font-family',
    'color',
  ] as const;

  beforeAll(async () => {
    const classes = [
      containerClasses({ as: 'article' }, {}).root,
      cardClasses({}, {}).root,
      cardClasses({ surface: 'primary' }, {}).root,
      'text-foreground',
      ...PAIRS.map(([, variant]) => resolveTypography(variant)),
    ].join(' ');
    sheet = document.createElement('style');
    sheet.textContent = await commands.compileCss(classes);
    document.head.append(sheet);
  }, 30000);

  afterAll(() => {
    sheet?.remove();
  });

  it('each article element computes the type of its Typography variant', () => {
    render(
      <div style={{ width: '960px' }}>
        <Container as="article" size="full" data-testid="article">
          <h1>a</h1>
          <h2>a</h2>
          <h3>a</h3>
          <h4>a</h4>
          <p>a</p>
          <ul>
            <li>a</li>
          </ul>
          <ol>
            <li>a</li>
          </ol>
          <blockquote>a</blockquote>
          <code>a</code>
          <pre>a</pre>
        </Container>
        <div className="@container w-full" data-testid="typography">
          {PAIRS.map(([tag, variant]) =>
            React.createElement(tag, { key: tag, className: resolveTypography(variant) }, 'a'),
          )}
        </div>
      </div>,
    );
    const article = body().querySelector('[data-testid="article"]') as HTMLElement;
    const typography = body().querySelector('[data-testid="typography"]') as HTMLElement;
    for (const [tag] of PAIRS) {
      const prose = getComputedStyle(article.querySelector(tag) as HTMLElement);
      const typed = getComputedStyle(typography.querySelector(tag) as HTMLElement);
      for (const property of TYPE) {
        expect
          .soft(prose.getPropertyValue(property), `${tag} ${property}`)
          .toBe(typed.getPropertyValue(property));
      }
    }
  });

  it.each([
    ['a Card', undefined],
    ['a surface="primary" Card', 'primary'],
  ])('bare prose in an article inside %s computes the surface foreground', (_, surface) => {
    render(
      <div>
        <span data-testid="paired" className="text-foreground" />
        <Card surface={surface} data-testid="surface">
          <Container as="article">
            <h2>Heading</h2>
            <p>Body</p>
            <ul>
              <li>one</li>
            </ul>
            <blockquote>Quoted</blockquote>
            <code>x</code>
          </Container>
        </Card>
      </div>,
    );
    const root = body().querySelector('[data-testid="surface"]') as HTMLElement;
    const foreground = getComputedStyle(root).color;
    expect(getComputedStyle(root).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    for (const el of root.querySelectorAll('h2, p, ul, li, blockquote')) {
      expect.soft(getComputedStyle(el).color, el.tagName).toBe(foreground);
    }
    // code paints bg-muted, so it computes the foreground paired with it.
    const paired = body().querySelector('[data-testid="paired"]') as HTMLElement;
    const code = root.querySelector('code') as HTMLElement;
    expect(getComputedStyle(code).color, 'CODE').toBe(getComputedStyle(paired).color);
  });
});
