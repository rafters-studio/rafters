/**
 * React performance of the Badge score. A pure static -- proves the empty
 * ARIA projection, the single declared part, and the classes channel
 * (variant/size defaults + consumer className merge).
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { installIconLayout, ICON_SVG_16, ICON_SVG_20, rectsOf } from './icon-layout';
import { Badge } from '../../../src/components/badge/badge';
import { badge } from '../../../src/components/badge/badge.behavior';

afterEach(() => {
  cleanup();
});

describe('badge [react]', () => {
  it('renders a span carrying data-part="root" and the children as label text', () => {
    const { container } = render(<Badge>New</Badge>);
    const root = container.querySelector('[data-part="root"]');
    expect(root?.tagName).toBe('SPAN');
    expect(root?.textContent).toBe('New');
  });

  it('projects no ARIA role -- the label text is the accessible name', () => {
    const { container } = render(<Badge>Beta</Badge>);
    const root = container.querySelector('[data-part="root"]') as HTMLElement;
    expect(root?.getAttribute('role')).toBeNull();
  });

  it('fulfills the contract: the projection is empty for a static chip', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    const root = container.querySelector('[data-part="root"]') as HTMLElement;
    const projection = badge.aria({}, { variant: 'info', size: 'default' }, { root: root.id });
    expect(projection.root).toEqual({});
  });

  it('carries the shadcn data-slot for drop-in parity', () => {
    const { container } = render(<Badge>Slotted</Badge>);
    const root = container.querySelector('[data-part="root"]') as HTMLElement;
    expect(root.getAttribute('data-slot')).toBe('badge');
  });

  it('defaults to the primary variant and default size', () => {
    const { container } = render(<Badge>Default</Badge>);
    const root = container.querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).toContain('px-2.5');
  });

  it('size selects the label-text scale', () => {
    const { container } = render(<Badge size="lg">Large</Badge>);
    const root = container.querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('ts-label-medium');
  });

  it('consumer className merges via classy', () => {
    const { container } = render(<Badge className="ml-2">Tagged</Badge>);
    const root = container.querySelector('[data-part="root"]') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).toContain('ml-2');
  });

  it('forwards the ref to the rendered span (tooltip/popover anchoring)', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<Badge ref={ref}>Ref</Badge>);
    expect(ref.current?.tagName).toBe('SPAN');
  });

  it('passes through arbitrary HTML attributes', () => {
    const { container } = render(
      <Badge data-testid="badge" aria-label="status">
        Test
      </Badge>,
    );
    const el = container.querySelector('[data-testid="badge"]');
    expect(el?.getAttribute('aria-label')).toBe('status');
  });
});

describe('badge icons [react]', () => {
  let uninstall: () => void;
  beforeEach(() => {
    uninstall = installIconLayout();
  });
  afterEach(() => uninstall());

  const svg = (markup: string) => <span dangerouslySetInnerHTML={{ __html: markup }} />;
  const label = <span data-label>New</span>;
  const rootOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;

  it('start, end and both render beside the label on one line', () => {
    for (const [name, node] of [
      [
        'start',
        <Badge key="start" startIcon={svg(ICON_SVG_16)}>
          {label}
        </Badge>,
      ],
      [
        'end',
        <Badge key="end" endIcon={svg(ICON_SVG_16)}>
          {label}
        </Badge>,
      ],
      [
        'both',
        <Badge key="both" startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_16)}>
          {label}
        </Badge>,
      ],
    ] as const) {
      const { container, unmount } = render(node);
      const r = rectsOf(rootOf(container));
      if (name !== 'end') {
        expect(r.start, name).not.toBeNull();
        expect(r.start?.right as number).toBeLessThanOrEqual(r.label.left + 0.5);
        expect(Math.abs((r.start?.top as number) - r.label.top)).toBeLessThan(r.label.height);
      }
      if (name !== 'start') {
        expect(r.end, name).not.toBeNull();
        expect(r.end?.left as number).toBeGreaterThanOrEqual(r.label.right - 0.5);
        expect(Math.abs((r.end?.top as number) - r.label.top)).toBeLessThan(r.label.height);
      }
      unmount();
    }
  });

  it('on a dir="rtl" page the start icon renders on the right of the label', () => {
    document.documentElement.dir = 'rtl';
    const { container } = render(<Badge startIcon={svg(ICON_SVG_16)}>{label}</Badge>);
    const r = rectsOf(rootOf(container));
    expect((r.start as DOMRect).left).toBeGreaterThan(r.label.left);
  });

  it('an icon keeps its own size', () => {
    const { container } = render(
      <Badge startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_20)}>
        {label}
      </Badge>,
    );
    const r = rectsOf(rootOf(container));
    expect(r.start?.width).toBe(16);
    expect(r.end?.width).toBe(20);
  });

  it('each wrapper is aria-hidden, carries data-icon, and is absent when no icon is given', () => {
    const { container } = render(
      <Badge startIcon={svg(ICON_SVG_16)} endIcon={svg(ICON_SVG_16)}>
        {label}
      </Badge>,
    );
    for (const part of ['startIcon', 'endIcon']) {
      expect(container.querySelector(`[data-part="${part}"]`)?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    }
    expect(container.querySelector('[data-part="startIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-start',
    );
    expect(container.querySelector('[data-part="endIcon"]')?.getAttribute('data-icon')).toBe(
      'inline-end',
    );
    cleanup();
    const bare = render(<Badge>New</Badge>);
    expect(bare.container.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(bare.container.querySelector('[data-part="endIcon"]')).toBeNull();
  });

  it('the accessible name is the label alone even when the svg has a title', async () => {
    render(
      <Badge
        role="status"
        startIcon={
          <svg viewBox="0 0 24 24" width="16" height="16">
            <title>Mail icon</title>
          </svg>
        }
      >
        Sent
      </Badge>,
    );
    await expect
      .element(page.getByRole('status', { name: 'Sent', exact: true }))
      .toBeInTheDocument();
  });
});
