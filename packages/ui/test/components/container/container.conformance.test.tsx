import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Container } from '../../../src/components/container/container';
import { assertAxeClean } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('container conformance [react]', () => {
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
    await assertAxeClean(body());
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
