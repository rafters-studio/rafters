/**
 * Astro performance of the Avatar score. A caller-decides static -- the score
 * projects no ARIA and runs no effects, so the Astro file ships NO <script>
 * and there is NO bindAvatar. The caller passes `src` for the image or omits
 * it (or sets `status`) to fall back; presence comes from the shared
 * `resolveAvatar`. This test renders the server markup and asserts presence,
 * the empty projection, and axe cleanliness.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import { assertAxeClean, partElement } from '../../harness/conformance';
import { avatarSizeClasses } from '../../../src/components/avatar/avatar.classes';
import Avatar from '../../../src/components/avatar/avatar.astro';

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

function part(body: HTMLElement, name: string): HTMLElement | null {
  return body.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

describe('avatar conformance [astro]', () => {
  it('renders a root part carrying the shared base + size classes', async () => {
    const body = await render({ src: '/user.jpg', alt: 'Jane Doe' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.className).toContain('rounded-full');
    expect(root.className).toContain(avatarSizeClasses.md);
  });

  it('projects NO ARIA: the root is a pure static surface (no role)', async () => {
    const body = await render({ src: '/user.jpg', alt: 'Jane Doe' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.getAttribute('role')).toBeNull();
  });

  it('a present src renders the image only', async () => {
    const body = await render({ src: '/user.jpg', alt: 'Jane Doe' });
    expect(part(body, 'image')).not.toBeNull();
    expect(part(body, 'fallback')).toBeNull();
  });

  it('an absent src falls back, rendering the fallback text', async () => {
    const body = await render({ fallback: 'JD' });
    expect(part(body, 'image')).toBeNull();
    const fallback = part(body, 'fallback');
    expect(fallback).not.toBeNull();
    expect(fallback?.textContent).toContain('JD');
  });

  it('status="error" with a src removes the image and shows the fallback', async () => {
    const body = await render({ src: '/user.jpg', status: 'error', fallback: 'JD' });
    expect(part(body, 'image')).toBeNull();
    expect(part(body, 'fallback')).not.toBeNull();
  });

  it('status="loading" keeps both the image and the fallback', async () => {
    const body = await render({
      src: '/user.jpg',
      alt: 'Jane Doe',
      status: 'loading',
      fallback: 'JD',
    });
    expect(part(body, 'image')).not.toBeNull();
    expect(part(body, 'fallback')).not.toBeNull();
  });

  it('reflects the size prop onto the root class string', async () => {
    const body = await render({ size: 'xl', src: '/user.jpg', alt: 'Jane Doe' });
    const root = partElement(body, 'root') as HTMLElement;
    expect(root.className).toContain(avatarSizeClasses.xl);
  });

  it('is axe-clean with an alt-bearing image', async () => {
    const body = await render({ src: '/user.jpg', alt: 'Jane Doe' });
    await assertAxeClean(body);
  });
});
