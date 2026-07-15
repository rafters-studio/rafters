import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../src/components/card/card';
import { card } from '../../../src/components/card/card.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

describe('card conformance [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(<Card data-testid="c">body</Card>);
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(card, root, {}, {}, ['root']);
    // The empty projection means no role/aria-* leaks onto the surface.
    expect(root.getAttribute('role')).toBeNull();
    expect(root.getAttribute('aria-label')).toBeNull();
  });

  it('as drives the semantic element -- the surface carries no landmark of its own', () => {
    render(
      <Card as="article" data-testid="c">
        content
      </Card>,
    );
    expect(body().querySelector('article[data-part="root"]')).not.toBeNull();
  });

  it('composes the full family and passes slot content through, axe-clean', async () => {
    // Rendered inside a landmark -- a card is a surface, not a landmark, so
    // the page around it supplies the region (axe best-practice `region`).
    render(
      <main>
        <Card as="section" data-testid="card">
          <CardHeader>
            <CardTitle>Quarterly report</CardTitle>
            <CardDescription>Published this week</CardDescription>
            <CardAction>
              <button type="button">Menu</button>
            </CardAction>
          </CardHeader>
          <CardContent>Revenue is up.</CardContent>
          <CardFooter>
            <button type="button">Read more</button>
          </CardFooter>
        </Card>
      </main>,
    );
    const root = body().querySelector('[data-testid="card"]') as HTMLElement;
    expect(root.querySelector('h3')?.textContent).toBe('Quarterly report');
    expect(root.textContent).toContain('Published this week');
    expect(root.textContent).toContain('Revenue is up.');
    expect(root.querySelectorAll('button')).toHaveLength(2);
    // Only root is a declared part -- the surface itself carries the sole
    // data-part, and no descendant does (boundary 5).
    expect(root.getAttribute('data-part')).toBe('root');
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
    await assertAxeClean(body());
  });

  it('CardTitle places the heading level via as', () => {
    render(
      <Card>
        <CardTitle as="h2">Level two</CardTitle>
      </Card>,
    );
    expect(body().querySelector('h2')?.textContent).toBe('Level two');
  });

  it('a resolved fill replaces the surface and records data-fill', () => {
    render(<Card fill="primary">x</Card>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).not.toContain('bg-card');
    expect(root.getAttribute('data-fill')).toBe('primary');
  });

  it('consumer className merges via classy', () => {
    render(<Card className="mt-4">x</Card>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('rounded-lg');
    expect(root.className).toContain('mt-4');
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    // A static score claims no keys; nothing to interact with.
    expect(card.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
