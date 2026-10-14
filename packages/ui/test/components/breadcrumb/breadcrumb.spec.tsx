import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installIconLayout, ICON_SVG_16, ICON_SVG_20, rectsOf } from './icon-layout';
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

describe('breadcrumb [react]', () => {
  it('fulfills the contract: root renders and projects NO ARIA', () => {
    const { container } = render(fullTrail());
    const root = container.querySelector<HTMLElement>('[data-part="root"]');
    expect(root, 'declared part "root" must be rendered').not.toBeNull();
    expect(breadcrumb.aria({}, {}, { root: root?.id ?? '' }).root).toEqual({});
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

  it('has no keyboard contract and dispatches nothing observable', () => {
    expect(breadcrumb.keymap({ key: 'Enter' }, {}, 'root', {})).toBeNull();
  });
});

describe('breadcrumb icons [react]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const svg = (markup: string) => <span dangerouslySetInnerHTML={{ __html: markup }} />;
  const label = (text: string) => <span data-label>{text}</span>;

  function trail(
    link: Partial<React.ComponentProps<typeof BreadcrumbLink>>,
    current: Partial<React.ComponentProps<typeof BreadcrumbPage>>,
  ) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" {...link}>
              {label('Home')}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage {...current}>{label('Widget')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  const linkOf = (c: HTMLElement) => c.querySelector('a') as HTMLElement;
  const pageOf = (c: HTMLElement) => c.querySelector('[aria-current="page"]') as HTMLElement;

  it('start, end and both render beside the label on the link and the page', () => {
    for (const icons of [
      { startIcon: svg(ICON_SVG_16) },
      { endIcon: svg(ICON_SVG_16) },
      { startIcon: svg(ICON_SVG_16), endIcon: svg(ICON_SVG_16) },
    ]) {
      const { container, unmount } = render(trail(icons, icons));
      for (const el of [linkOf(container), pageOf(container)]) {
        const r = rectsOf(el);
        if (r.start) expect(r.start.right).toBeLessThanOrEqual(r.label.left + 0.5);
        if (r.end) expect(r.end.left).toBeGreaterThanOrEqual(r.label.right - 0.5);
        expect(!!r.start).toBe('startIcon' in icons);
        expect(!!r.end).toBe('endIcon' in icons);
      }
      unmount();
    }
  });

  it('each wrapper is aria-hidden and absent when no icon is given', () => {
    const { container } = render(trail({ startIcon: svg(ICON_SVG_16) }, { endIcon: 'x' }));
    const start = linkOf(container).querySelector('[data-part="startIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(linkOf(container).querySelector('[data-part="endIcon"]')).toBeNull();
    const end = pageOf(container).querySelector('[data-part="endIcon"]');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    expect(pageOf(container).querySelector('[data-part="startIcon"]')).toBeNull();
  });

  it('with no icon the link and the page render no wrapper', () => {
    const { container } = render(trail({}, {}));
    expect(container.querySelectorAll('[data-icon]')).toHaveLength(0);
  });

  it('asChild puts the icons inside the merged child', () => {
    const { container } = render(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild startIcon={svg(ICON_SVG_16)}>
              <a href="/custom">{label('Home')}</a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );
    const link = container.querySelector('a[href="/custom"]') as HTMLElement;
    expect(link.firstElementChild?.getAttribute('data-part')).toBe('startIcon');
    expect(link.querySelector('[data-label]')?.textContent).toBe('Home');
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', () => {
    document.documentElement.dir = 'rtl';
    const { container } = render(trail({ startIcon: svg(ICON_SVG_16) }, { startIcon: 'x' }));
    for (const el of [linkOf(container), pageOf(container)]) {
      const r = rectsOf(el);
      expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
    }
  });

  it('an icon keeps its own size', () => {
    const { container } = render(
      trail({ startIcon: svg(ICON_SVG_16), endIcon: svg(ICON_SVG_20) }, {}),
    );
    const r = rectsOf(linkOf(container));
    expect(r.start?.width).toBe(16);
    expect(r.end?.width).toBe(20);
  });
});
