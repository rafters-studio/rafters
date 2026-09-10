/**
 * Ported conformance for Image, Web Component target, driven against
 * light-DOM markup. Same score as the React and Astro conformances: the host
 * renders a real <figure data-part="root"> and bindImage applies the aria
 * projection. Proves the static projection drives identically through the DOM
 * binding, and that a live attribute change re-derives config.
 */
import { afterEach, beforeAll, expect, test } from 'vitest';
import { RaftersImage } from '../../../src/components/image/image.element';
import {
  image,
  type ImageConfig,
  type ImagePart,
  type ImageState,
} from '../../../src/components/image/image.behavior';

const SRC = 'https://example.com/photo.jpg';

beforeAll(() => {
  if (!customElements.get('rafters-image')) {
    customElements.define('rafters-image', RaftersImage);
  }
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

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `<main><rafters-image ${attrs}></rafters-image></main>`;
  await Promise.resolve(); // let the element's deferred build + bind run
  return part(document.body, 'root') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

test('loaded: renders a real figure/img, no overlay, projection fulfilled', async () => {
  const root = await mount(`src="${SRC}" alt="A sunset"`);
  expect(root.tagName).toBe('FIGURE');
  const img = part(root, 'img') as HTMLImageElement;
  expect(img.getAttribute('src')).toBe(SRC);
  expect(img.getAttribute('alt')).toBe('A sunset');
  expect(img.hasAttribute('aria-busy')).toBe(false);
  expect(part(root, 'status')).toBeNull();
  const config: ImageConfig = { status: 'loaded' };
  assertContract(root, {}, config, ['root', 'frame', 'img']);
});

test('defaults alt to empty string when the attribute is absent', async () => {
  const root = await mount(`src="${SRC}"`);
  const img = part(root, 'img') as HTMLImageElement;
  expect(img.getAttribute('alt')).toBe('');
});

test('loading: the img is aria-busy and the overlay is role="status"', async () => {
  const root = await mount(`src="${SRC}" alt="Loading" data-status="loading"`);
  const img = part(root, 'img') as HTMLElement;
  expect(img.getAttribute('aria-busy')).toBe('true');
  const status = part(root, 'status') as HTMLElement;
  expect(status.getAttribute('role')).toBe('status');
  expect(status.textContent).toBe('Loading image');
  assertContract(root, {}, { status: 'loading' }, ['root', 'frame', 'img', 'status']);
});

test('error: the overlay is role="alert" carrying the message', async () => {
  const root = await mount(
    `src="${SRC}" alt="Broken" data-status="error" data-error-message="Gone"`,
  );
  const status = part(root, 'status') as HTMLElement;
  expect(status.getAttribute('role')).toBe('alert');
  expect(status.textContent).toBe('Gone');
});

test('renders a real figcaption when the caption attribute is set', async () => {
  const root = await mount(`src="${SRC}" alt="Photo" caption="Photo by John"`);
  const caption = part(root, 'caption') as HTMLElement;
  expect(caption.tagName).toBe('FIGCAPTION');
  expect(caption.textContent).toBe('Photo by John');
});

test('a live status change re-derives the projection (loading -> loaded)', async () => {
  await mount(`src="${SRC}" alt="Photo" data-status="loading"`);
  const host = document.querySelector('rafters-image') as HTMLElement;
  expect((part(document.body, 'img') as HTMLElement).getAttribute('aria-busy')).toBe('true');
  host.setAttribute('data-status', 'loaded');
  await Promise.resolve();
  const img = part(document.body, 'img') as HTMLElement;
  expect(img.hasAttribute('aria-busy')).toBe(false);
  expect(part(document.body, 'status')).toBeNull();
  // The figure is rebuilt in place, not duplicated.
  expect(document.querySelectorAll('[data-part="root"]')).toHaveLength(1);
});
