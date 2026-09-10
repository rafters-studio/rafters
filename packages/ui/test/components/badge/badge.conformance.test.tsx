import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { badge } from '../../../src/components/badge/badge.behavior';
import { Badge } from '../../../src/components/badge/badge';
import { assertContractFulfillment } from '../../harness/conformance';

afterEach(() => {
  cleanup();
});

describe('badge conformance [react]', () => {
  it('renders a span carrying data-part="root" and the children as label text', () => {
    const { container } = render(<Badge>New</Badge>);
    const root = container.querySelector('[data-part="root"]');
    expect(root?.tagName).toBe('SPAN');
    expect(root?.textContent).toBe('New');
  });

  it('projects no ARIA role -- the label text is the accessible name', () => {
    const { container } = render(<Badge>Beta</Badge>);
    const root = container.querySelector('[data-part="root"]');
    expect(root?.getAttribute('role')).toBeNull();
  });

  it('fulfills the contract projection through the shared harness', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    // The projection is empty for a static chip; the harness asserts part
    // presence and that no unprojected aria leaks onto the rendered DOM.
    assertContractFulfillment(badge, container, {}, { variant: 'info', size: 'default' }, ['root']);
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
