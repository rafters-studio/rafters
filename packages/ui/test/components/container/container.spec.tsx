import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { Container } from '../../../src/components/container/container';
import { containerClasses } from '../../../src/components/container/container.classes';

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
