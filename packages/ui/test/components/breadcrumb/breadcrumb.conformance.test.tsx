import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../../../src/components/breadcrumb/breadcrumb';
import { breadcrumb } from '../../../src/components/breadcrumb/breadcrumb.behavior';
import { assertAxeClean, assertContractFulfillment, partElement } from '../../harness/conformance';

const body = () => document.body;

afterEach(() => {
  cleanup();
});

function fullTrail() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/products">Products</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Widget</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe('breadcrumb conformance [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(fullTrail());
    const root = partElement(container, 'root') as HTMLElement;
    assertContractFulfillment(breadcrumb, root, {}, {}, ['root']);
  });

  it('the root IS the nav landmark labelled "Breadcrumb"', () => {
    render(fullTrail());
    const root = body().querySelector('nav[data-part="root"]') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName.toLowerCase()).toBe('nav');
    expect(root.getAttribute('aria-label')).toBe('Breadcrumb');
  });

  it('the current page is marked and never clickable', () => {
    // The whole earned semantic: aria-current="page" identifies the location,
    // and role="link" + aria-disabled="true" makes it a non-navigable marker.
    render(fullTrail());
    const page = body().querySelector('[aria-current="page"]') as HTMLElement;
    expect(page).not.toBeNull();
    expect(page.textContent).toBe('Widget');
    expect(page.getAttribute('role')).toBe('link');
    expect(page.getAttribute('aria-disabled')).toBe('true');
    // The current page is NOT an anchor -- it cannot be followed.
    expect(page.tagName.toLowerCase()).not.toBe('a');
  });

  it('separators are decoration: aria-hidden and role=presentation', () => {
    render(fullTrail());
    const separators = Array.from(
      body().querySelectorAll('li[role="presentation"]'),
    ) as HTMLElement[];
    expect(separators.length).toBe(3);
    for (const sep of separators) {
      expect(sep.getAttribute('aria-hidden')).toBe('true');
      // A default separator ships a decorative chevron, itself hidden.
      expect(sep.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('the ellipsis hides its glyph and exposes an sr-only label', () => {
    render(fullTrail());
    const ellipsis = body().querySelector('span[role="presentation"]') as HTMLElement;
    expect(ellipsis).not.toBeNull();
    expect(ellipsis.getAttribute('aria-hidden')).toBe('true');
    expect(ellipsis.querySelector('.sr-only')?.textContent).toBe('More');
  });

  it('ancestor links are real anchors carrying their hrefs', () => {
    render(fullTrail());
    const links = Array.from(body().querySelectorAll('a')) as HTMLAnchorElement[];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/', '/products']);
  });

  it('only the root is a declared part -- the family carries no data-part', () => {
    render(fullTrail());
    const root = body().querySelector('[data-part="root"]') as HTMLElement;
    expect(root.querySelectorAll('[data-part]')).toHaveLength(0);
  });

  it('BreadcrumbLink asChild merges onto a custom child element', () => {
    render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="/custom" data-router="true">
                Products
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const link = body().querySelector('a[data-router="true"]') as HTMLAnchorElement;
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/custom');
    expect(link.className).toContain('transition-colors');
  });

  it('the full trail is axe-clean -- the nav is its own landmark', async () => {
    render(fullTrail());
    await assertAxeClean(body());
  });

  it('has no keyboard contract and dispatches nothing observable', () => {
    expect(breadcrumb.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});
