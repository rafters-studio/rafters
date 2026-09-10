/**
 * Astro performance of the Spinner score. Spinner is a PURE STATIC -- the
 * score projects one constant ARIA attribute, holds no state, runs no effects
 * -- so its Astro file ships NO <script> and there is NO bindSpinner. This
 * test renders the server markup and asserts the one contract a static busy
 * indicator carries: the output root, the projected aria-label, and the ring
 * classes. One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Spinner from '../../../src/components/spinner/spinner.astro';
import { spinner } from '../../../src/components/spinner/spinner.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Spinner, { props });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

function root(host: HTMLElement): HTMLElement {
  return host.querySelector<HTMLElement>('[data-part="root"]') as HTMLElement;
}

describe('spinner conformance [astro]', () => {
  it('renders an output root carrying the shared spinner classes', async () => {
    const el = root(await render());
    expect(el).not.toBeNull();
    expect(el.tagName.toLowerCase()).toBe('output');
    expect(el.className).toContain('animate-spin-spin');
    expect(el.className).not.toContain('motion-reduce:animate-none');
  });

  it('fulfills the contract: root projects aria-label="Loading", no explicit role', async () => {
    const el = root(await render());
    const projection = spinner.aria({}, {}, { root: el.id })['root'];
    for (const [attr, value] of Object.entries(projection ?? {})) {
      if (value === undefined) {
        expect(el.hasAttribute(attr), `root must NOT render ${attr}`).toBe(false);
      } else {
        expect(el.getAttribute(attr), `root ${attr}`).toBe(String(value));
      }
    }
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBe('Loading');
  });

  it('size and variant mirror the React/WC props through the same projection', async () => {
    const el = root(await render({ size: 'lg', variant: 'destructive' }));
    expect(el.className).toContain('h-8 w-8 border-3');
    expect(el.className).toContain('border-destructive border-r-transparent');
  });

  it('root is the only declared part', async () => {
    const parts = (await render()).querySelectorAll('[data-part]');
    expect(parts).toHaveLength(1);
  });

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const el = root(await render({ class: 'ml-2' }));
    expect(el.className).toContain('animate-spin-spin');
    expect(el.className).not.toContain('ml-2');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
