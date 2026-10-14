/**
 * Astro performance of the Badge score. Badge is a PURE STATIC -- the score
 * holds no state, claims no keys and projects an EMPTY aria map -- so its Astro
 * file ships NO <script> and there is NO bindBadge. This test renders the
 * server markup and asserts the contract a label chip carries: a root span
 * with the shared classes, the slotted label as the entire accessible
 * payload, and no projected role. One score, three performances; here it is
 * markup + classes, nothing more.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Badge from '../../../src/components/badge/badge.astro';
import { badge } from '../../../src/components/badge/badge.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

function partElement(root: ParentNode, part: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`);
}

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = { default: 'New' },
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Badge, { props, slots });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

describe('badge [astro]', () => {
  it('renders a span carrying data-part="root" and the slotted label text', async () => {
    const doc = await render();
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.tagName).toBe('SPAN');
    expect(root.textContent).toBe('New');
  });

  it('projects no ARIA role -- the label text is the accessible name', async () => {
    const doc = await render({}, { default: 'Beta' });
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('fulfills the contract: the projection is empty for a static chip', async () => {
    const doc = await render({ variant: 'info' }, { default: 'Info' });
    const root = partElement(doc, 'root') as HTMLElement;
    const projection = badge.aria({}, { variant: 'info', size: 'default' }, { root: root.id });
    expect(projection.root).toEqual({});
  });

  it('defaults to the primary variant and default size (like React)', async () => {
    const doc = await render();
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).toContain('px-2.5');
  });

  it('size selects the label-text scale', async () => {
    const doc = await render({ size: 'lg' }, { default: 'Large' });
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root.className).toContain('ts-label-medium');
  });

  it('carries the shadcn data-slot for drop-in parity', async () => {
    const doc = await render();
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root.getAttribute('data-slot')).toBe('badge');
  });

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const doc = await render({ class: 'ml-2' }, { default: 'Tagged' });
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root.className).toContain('bg-primary');
    expect(root.className).not.toContain('ml-2');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it('passes through arbitrary HTML attributes', async () => {
    const doc = await render({ 'data-testid': 'badge', 'aria-label': 'status' });
    const element = doc.querySelector('[data-testid="badge"]');
    expect(element?.getAttribute('aria-label')).toBe('status');
  });

  it('is a leaf: exactly one declared part when no icon is given', async () => {
    const doc = await render();
    expect(doc.querySelectorAll('[data-part]')).toHaveLength(1);
  });

  it('icons: the server markup already hides each wrapper, before any script runs', async () => {
    const doc = await render(
      {},
      { default: 'New', 'start-icon': '<svg><title>Mail</title></svg>', 'end-icon': '<svg></svg>' },
    );
    const start = partElement(doc, 'startIcon');
    const end = partElement(doc, 'endIcon');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    const order = [...doc.querySelectorAll('[data-part]')].map((el) =>
      el.getAttribute('data-part'),
    );
    expect(order).toEqual(['root', 'startIcon', 'endIcon']);
    const root = partElement(doc, 'root') as HTMLElement;
    expect(root.firstElementChild).toBe(start);
    expect(root.lastElementChild).toBe(end);
    expect(root.textContent).toContain('New');
  });

  it('icons: no wrapper when no icon slot is given', async () => {
    const doc = await render({}, { default: 'New' });
    expect(partElement(doc, 'startIcon')).toBeNull();
    expect(partElement(doc, 'endIcon')).toBeNull();
  });
});
