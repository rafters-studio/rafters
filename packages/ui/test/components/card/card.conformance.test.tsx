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

  it('className is NOT SUPPORTED -- it never reaches the element', () => {
    // The deliberate API break in the drop-in contract (see card.md). The props
    // type Omits className, so this cast is what a JavaScript caller would do;
    // the runtime strip is what stops `...props` smuggling it through anyway.
    // Asserting absence is the point -- a deleted test would be no evidence.
    render(<Card {...({ className: 'mt-4' } as unknown as Record<string, never>)}>x</Card>);
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('rounded-xl');
    expect(root.className).not.toContain('mt-4');
  });

  it('className is refused by every sub-component too, not just the root', () => {
    const smuggled = { className: 'mt-4' } as unknown as Record<string, never>;
    render(
      <Card>
        <CardHeader {...smuggled}>
          <CardTitle {...smuggled}>t</CardTitle>
          <CardDescription {...smuggled}>d</CardDescription>
          <CardAction {...smuggled}>a</CardAction>
        </CardHeader>
        <CardContent {...smuggled}>c</CardContent>
        <CardFooter {...smuggled}>f</CardFooter>
      </Card>,
    );
    for (const slot of [
      'card-header',
      'card-title',
      'card-description',
      'card-action',
      'card-content',
      'card-footer',
    ]) {
      const el = body().querySelector(`[data-slot="${slot}"]`) as HTMLElement;
      expect(el, slot).not.toBeNull();
      expect(el.className, slot).not.toContain('mt-4');
    }
  });

  it('data-slot is the swap contract: every node carries shadcn v4 names', () => {
    // A consumer's `has-data-[slot=card-action]` / `[data-slot=card]` selectors
    // must keep matching after the swap. data-part stays the INTERNAL binding
    // contract and remains root-only.
    render(
      <Card>
        <CardHeader>
          <CardTitle>t</CardTitle>
          <CardDescription>d</CardDescription>
          <CardAction>a</CardAction>
        </CardHeader>
        <CardContent>c</CardContent>
        <CardFooter>f</CardFooter>
      </Card>,
    );
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.getAttribute('data-slot')).toBe('card');
    for (const slot of [
      'card-header',
      'card-title',
      'card-description',
      'card-action',
      'card-content',
      'card-footer',
    ]) {
      expect(body().querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }
  });

  it('CardAction is a DIRECT CHILD of the grid header, so its placement resolves', () => {
    // The proof is structural + class, not computed layout: jsdom has no
    // compiled Tailwind sheet, so getComputedStyle would report nothing either
    // way. What was actually broken is the parentage -- placement utilities
    // with a `flex flex-col` parent. These assertions lock the two things that
    // make them take effect: a grid header, and the action directly inside it.
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle>t</CardTitle>
          <CardAction data-testid="action">
            <button type="button">Menu</button>
          </CardAction>
        </CardHeader>
      </Card>,
    );
    const header = body().querySelector('[data-testid="header"]') as HTMLElement;
    const action = body().querySelector('[data-testid="action"]') as HTMLElement;
    expect(action.parentElement).toBe(header);
    expect(header.className).toContain('grid');
    expect(header.className).toContain('has-data-[slot=card-action]:grid-cols-[1fr_auto]');
    expect(action.className).toContain('col-start-2');
    expect(action.className).toContain('row-start-1');
    // And the variant has something to match on: the action's own data-slot.
    expect(header.querySelector('[data-slot="card-action"]')).toBe(action);
  });

  it('a header with NO action still has no second column to place into', () => {
    render(
      <Card>
        <CardHeader data-testid="header">
          <CardTitle>t</CardTitle>
          <CardDescription>d</CardDescription>
        </CardHeader>
      </Card>,
    );
    const header = body().querySelector('[data-testid="header"]') as HTMLElement;
    // The grid-cols variant is present in the class string but has nothing to
    // match: no descendant carries data-slot="card-action", so the header stays
    // single-column.
    expect(header.querySelector('[data-slot="card-action"]')).toBeNull();
    expect(header.className).toContain('grid-rows-[auto_auto]');
  });

  it('CardDescription is a real p and CardTitle a real heading (the AAA divergence)', () => {
    // shadcn renders div/div here. Ours are behavior-additive and API-identical.
    render(
      <Card>
        <CardHeader>
          <CardTitle>t</CardTitle>
          <CardDescription>d</CardDescription>
        </CardHeader>
      </Card>,
    );
    expect((body().querySelector('[data-slot="card-title"]') as HTMLElement).tagName).toBe('H3');
    expect((body().querySelector('[data-slot="card-description"]') as HTMLElement).tagName).toBe(
      'P',
    );
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    // A static score claims no keys; nothing to interact with.
    expect(card.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
