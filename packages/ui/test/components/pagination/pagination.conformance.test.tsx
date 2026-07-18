import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../src/components/pagination/pagination';
import { pagination } from '../../../src/components/pagination/pagination.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

// Page 1 of a long range: Previous is disabled at the boundary, page 1 is the
// live current page, and the range is truncated with an ellipsis.
function fullPagination() {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="/page/1" disabled />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/page/1" isActive>
            1
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/page/2">2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="/page/10">10</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="/page/2" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

describe('pagination conformance [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(fullPagination());
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(pagination, root, {}, {}, ['root']);
  });

  it('the root IS the nav landmark labelled "Pagination"', () => {
    render(fullPagination());
    const root = body().querySelector('nav[data-part="root"]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('nav');
    expect(root.getAttribute('aria-label')).toBe('Pagination');
  });

  it('the current page is marked AND still a live, followable link', () => {
    // Divergence from breadcrumb: a pagination current page keeps navigating.
    // aria-current="page" identifies the location, but the control stays a real
    // anchor carrying its href -- it is NOT made non-clickable.
    render(fullPagination());
    const current = body().querySelector('[aria-current="page"]') as HTMLElement;
    expect(current).not.toBeNull();
    expect(current.textContent).toBe('1');
    expect(current.tagName.toLowerCase()).toBe('a');
    expect(current.getAttribute('href')).toBe('/page/1');
    expect(current.hasAttribute('aria-disabled')).toBe(false);
  });

  it('Previous is disabled at the boundary; Next stays enabled', () => {
    render(fullPagination());
    const prev = body().querySelector('[aria-label="Go to previous page"]') as HTMLElement;
    const next = body().querySelector('[aria-label="Go to next page"]') as HTMLElement;
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    // The standalone dimmer token is present only on the boundary control.
    // `classList.contains` matches exact tokens, so it never trips on the base
    // classes' `disabled:pointer-events-none` / `aria-disabled:pointer-events-none`
    // variant utilities.
    expect(prev.classList.contains('pointer-events-none')).toBe(true);
    expect(prev.classList.contains('opacity-50')).toBe(true);
    expect(next.hasAttribute('aria-disabled')).toBe(false);
    expect(next.classList.contains('pointer-events-none')).toBe(false);
  });

  it('button-style pagination disables the boundary control natively', () => {
    // onClick without href renders a <button>; disabled projects both the
    // native disabled attribute and aria-disabled.
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious onClick={() => {}} disabled />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext onClick={() => {}} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const prev = body().querySelector('[aria-label="Go to previous page"]') as HTMLButtonElement;
    expect(prev.tagName.toLowerCase()).toBe('button');
    expect(prev.disabled).toBe(true);
    expect(prev.getAttribute('aria-disabled')).toBe('true');
    const next = body().querySelector('[aria-label="Go to next page"]') as HTMLButtonElement;
    expect(next.tagName.toLowerCase()).toBe('button');
    expect(next.disabled).toBe(false);
  });

  it('the ellipsis hides its glyph and exposes an sr-only "More pages" label', () => {
    render(fullPagination());
    const ellipsis = body().querySelector('span[aria-hidden="true"]') as HTMLElement;
    expect(ellipsis).not.toBeNull();
    expect(ellipsis.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(ellipsis.querySelector('.sr-only')?.textContent).toBe('More pages');
  });

  it('ancestor page links are real anchors carrying their hrefs', () => {
    render(fullPagination());
    const links = Array.from(body().querySelectorAll('a')) as HTMLAnchorElement[];
    // Previous, 1 (current), 2, 10, Next.
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/page/1',
      '/page/1',
      '/page/2',
      '/page/10',
      '/page/2',
    ]);
  });

  it('only the root is a declared part -- the family carries no data-part', () => {
    render(fullPagination());
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('PaginationLink asChild merges onto a custom child element', () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink asChild isActive>
              <a href="/custom" data-router="true">
                3
              </a>
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>,
    );
    const link = body().querySelector('a[data-router="true"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/custom');
    expect(link.getAttribute('aria-current')).toBe('page');
    expect(link.className).toContain('transition-colors');
  });

  it('the full pagination is axe-clean -- the nav is its own landmark', async () => {
    render(fullPagination());
    await assertAxeClean(body());
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    expect(pagination.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
