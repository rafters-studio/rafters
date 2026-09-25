/**
 * Spec for Image, Astro target. Image is a STATIC score, but
 * its ARIA projection is LIVE (aria-busy / the overlay role), so this drives
 * it end to end. AstroContainer renders the SSR markup but does NOT run the
 * <script>, so the test calls bindImage directly -- that IS the script's job.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, expect, test, vi } from 'vitest';
import Image from '../../../src/components/image/image.astro';
import {
  bindImage,
  image,
  type ImageConfig,
  type ImagePart,
  type ImageState,
} from '../../../src/components/image/image.behavior';

const SRC = 'https://example.com/photo.jpg';

afterEach(() => {
  document.body.innerHTML = '';
});

function part(root: Element | ParentNode, name: string): HTMLElement | null {
  if (root instanceof Element && root.getAttribute('data-part') === name) return root;
  return root.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

/** Inlined equivalent of the harness's assertContractFulfillment. */
function assertContract(
  root: HTMLElement,
  state: ImageState,
  config: ImageConfig,
  expectedParts: readonly ImagePart[],
): void {
  for (const p of expectedParts) {
    const el = part(root, p);
    expect(el, `declared part "${p}" must be rendered`).not.toBeNull();
    const decl = image.parts[p];
    if (decl.role) expect(el?.getAttribute('role'), `part "${p}" role`).toBe(decl.role);
  }
  const allParts = Object.keys(image.parts) as ImagePart[];
  const ids = {} as Record<ImagePart, string>;
  for (const p of allParts) ids[p] = part(root, p)?.id ?? '';
  const projection = image.aria(state, config, ids);
  for (const p of allParts) {
    const attrs = projection[p];
    if (!attrs || !expectedParts.includes(p)) continue;
    const el = part(root, p);
    expect(el, `part "${p}" carrying aria`).not.toBeNull();
    if (!el) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(el.hasAttribute(attr), `part "${p}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(el.getAttribute(attr), `part "${p}" ${attr}`).toBe(String(value));
      }
    }
  }
}

async function mount(props: Record<string, unknown>): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Image, { props });
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('[data-part="root"][data-image]') as HTMLElement;
  bindImage(root); // the <script> does this per instance on the real page
  return root;
}

test('loaded: SSR markup carries the figure/img contract, bind re-affirms', async () => {
  const root = await mount({ src: SRC, alt: 'A sunset over the ocean' });
  expect(root.tagName).toBe('FIGURE');
  const img = part(root, 'img') as HTMLImageElement;
  expect(img.getAttribute('src')).toBe(SRC);
  expect(img.getAttribute('alt')).toBe('A sunset over the ocean');
  expect(img.getAttribute('loading')).toBe('lazy');
  expect(img.hasAttribute('aria-busy')).toBe(false);
  expect(part(root, 'status')).toBeNull();
  const config: ImageConfig = { alignment: 'center', radius: 'lg', status: 'loaded' };
  assertContract(root, {}, config, ['root', 'frame', 'img']);
});

test('loading: the img is aria-busy and the overlay is role="status"', async () => {
  const root = await mount({ src: SRC, alt: 'Loading', status: 'loading' });
  const img = part(root, 'img') as HTMLElement;
  expect(img.getAttribute('aria-busy')).toBe('true');
  const status = part(root, 'status') as HTMLElement;
  expect(status.getAttribute('role')).toBe('status');
  expect(status.textContent?.trim()).toBe('Loading image');
});

test('error: the overlay is role="alert" carrying the message', async () => {
  const root = await mount({ src: SRC, alt: 'Broken', status: 'error', errorMessage: 'Gone' });
  const status = part(root, 'status') as HTMLElement;
  expect(status.getAttribute('role')).toBe('alert');
  expect(status.textContent?.trim()).toBe('Gone');
});

test('renders a real figcaption when a caption is supplied', async () => {
  const root = await mount({ src: SRC, alt: 'Photo', caption: 'Photo by John Doe' });
  const caption = part(root, 'caption') as HTMLElement;
  expect(caption.tagName).toBe('FIGCAPTION');
  expect(caption.textContent?.trim()).toBe('Photo by John Doe');
});

test('consumer class is discarded silently -- not merged onto the root', async () => {
  const warn = vi.spyOn(console, 'warn');
  const error = vi.spyOn(console, 'error');
  const root = await mount({ src: SRC, alt: 'Photo', radius: '2xl', class: 'my-4' });
  // The figure carries base + alignment; the radius token lands on the frame.
  expect(root.className).toContain('mx-auto');
  expect(root.className).not.toContain('my-4');
  const frame = part(root, 'frame') as HTMLElement;
  expect(frame.className).toContain('rounded-2xl');
  expect(warn).not.toHaveBeenCalled();
  expect(error).not.toHaveBeenCalled();
});

// The #2001 pairing: config is data-* in the markup AND read through dataset
// in the bind. `size` and `fill` are real platform attributes elsewhere, so
// the bare spellings must not appear on the <figure> at all.
test('config crosses the SSR/bind seam as data-* only, and rehydration still works', async () => {
  const root = await mount({
    src: SRC,
    alt: 'Broken',
    size: 'md',
    alignment: 'left',
    radius: '2xl',
    fill: 'muted',
    status: 'error',
    errorMessage: 'Gone',
    loadingLabel: 'Wait',
  });

  const expected: Record<string, string> = {
    size: 'md',
    alignment: 'left',
    radius: '2xl',
    fill: 'muted',
    status: 'error',
    errorMessage: 'Gone',
    loadingLabel: 'Wait',
  };
  for (const [key, value] of Object.entries(expected)) {
    expect(root.dataset[key], `dataset.${key}`).toBe(value);
    const bare = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    expect(root.hasAttribute(bare), `bare attribute "${bare}" must not be rendered`).toBe(false);
  }

  // Rehydration: wipe the projected role, re-bind, and it comes back -- which
  // it can only do by reconstructing `status` from dataset.
  const status = part(root, 'status') as HTMLElement;
  status.removeAttribute('role');
  bindImage(root);
  expect(status.getAttribute('role')).toBe('alert');
  expect(status.textContent?.trim()).toBe('Gone');
});
