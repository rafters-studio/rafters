/**
 * Astro performance of the Avatar score. A caller-decides static -- the score
 * projects no ARIA and runs no effects, so the Astro file ships NO <script>
 * and there is NO bindAvatar. The caller passes `src` for the image or omits
 * it (or sets `status`) to fall back; presence comes from the shared
 * `resolveAvatar`. This test renders the server markup and asserts presence
 * and the empty projection.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Avatar from '../../../src/components/avatar/avatar.astro';
import { avatarSizeClasses } from '../../../src/components/avatar/avatar.classes';

afterEach(() => {
  document.body.innerHTML = '';
});

async function render(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Avatar, { props, slots });
  document.body.innerHTML = `<main>${html}</main>`;
  return document.body;
}

function part(doc: HTMLElement, name: string): HTMLElement | null {
  return doc.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

describe('avatar [astro]', () => {
  it('renders a root part carrying the shared base + size classes', async () => {
    const doc = await render({ src: '/user.jpg', alt: 'Jane Doe' });
    const root = part(doc, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('rounded-full');
    expect(root.className).toContain(avatarSizeClasses.md);
  });

  it('projects NO ARIA: the root is a pure static surface (no role)', async () => {
    const doc = await render({ src: '/user.jpg', alt: 'Jane Doe' });
    const root = part(doc, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('a present src renders the image only', async () => {
    const doc = await render({ src: '/user.jpg', alt: 'Jane Doe' });
    expect(part(doc, 'image')).not.toBeNull();
    expect(part(doc, 'fallback')).toBeNull();
  });

  it('an absent src falls back, rendering the fallback text', async () => {
    const doc = await render({ fallback: 'JD' });
    expect(part(doc, 'image')).toBeNull();
    const fallback = part(doc, 'fallback');
    expect(fallback).not.toBeNull();
    expect(fallback?.textContent).toContain('JD');
  });

  it('status="error" with a src removes the image and shows the fallback', async () => {
    const doc = await render({ src: '/user.jpg', status: 'error', fallback: 'JD' });
    expect(part(doc, 'image')).toBeNull();
    expect(part(doc, 'fallback')).not.toBeNull();
  });

  it('status="loading" keeps both the image and the fallback', async () => {
    const doc = await render({
      src: '/user.jpg',
      alt: 'Jane Doe',
      status: 'loading',
      fallback: 'JD',
    });
    expect(part(doc, 'image')).not.toBeNull();
    expect(part(doc, 'fallback')).not.toBeNull();
  });

  it('reflects the size prop onto the root class string', async () => {
    const doc = await render({ size: 'xl', src: '/user.jpg', alt: 'Jane Doe' });
    const root = part(doc, 'root') as HTMLElement;
    expect(root.className).toContain(avatarSizeClasses.xl);
  });

  it('consumer class is discarded silently -- not merged onto the root', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const doc = await render({ src: '/user.jpg', alt: 'Jane Doe', class: 'ml-2' });
    const root = part(doc, 'root') as HTMLElement;
    expect(root.className).toContain('rounded-full');
    expect(root.className).not.toContain('ml-2');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
