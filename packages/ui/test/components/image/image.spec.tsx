/**
 * Spec for Image, React target. A token-aware `<img>` wrapper
 * with figure/figcaption semantics. Image is a STATIC score -- no reducer
 * state, no actions, no keymap -- but its ARIA projection is LIVE: the `img`
 * part carries `aria-busy` while loading and the `status` overlay carries a
 * role (`alert` on error, `status` while loading).
 */
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Image } from '../../../src/components/image/image';
import {
  image,
  type ImageConfig,
  type ImagePart,
  type ImageState,
} from '../../../src/components/image/image.behavior';

function part(root: Element | ParentNode, name: string): HTMLElement | null {
  if (root instanceof Element && root.getAttribute('data-part') === name) return root;
  return root.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

/** Inlined equivalent of the former harness's assertContractFulfillment: every
 *  expected part is rendered (with its declared role, if any) and the DOM's
 *  ARIA equals the score's own projection, including absence. */
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

test('loaded: a figure/img contract fulfilled against real DOM, no overlay', async () => {
  const config: ImageConfig = { alignment: 'center', radius: 'lg', status: 'loaded' };
  const { container } = await render(
    <main>
      <Image src="https://example.com/photo.jpg" alt="A sunset over the ocean" />
    </main>,
  );
  const root = part(container, 'root') as HTMLElement;
  expect(root.tagName).toBe('FIGURE');
  const img = part(root, 'img') as HTMLImageElement;
  expect(img.getAttribute('alt')).toBe('A sunset over the ocean');
  expect(img.hasAttribute('aria-busy')).toBe(false);
  expect(part(root, 'status')).toBeNull();
  assertContract(root, {}, config, ['root', 'frame', 'img']);
});

test('loading: the img is aria-busy and a polite status overlay announces', async () => {
  const config: ImageConfig = { alignment: 'center', radius: 'lg', status: 'loading' };
  const { container } = await render(
    <main>
      <Image src="https://example.com/photo.jpg" alt="Loading photo" status="loading" />
    </main>,
  );
  const root = part(container, 'root') as HTMLElement;
  const img = part(root, 'img') as HTMLElement;
  expect(img.getAttribute('aria-busy')).toBe('true');
  const status = part(root, 'status') as HTMLElement;
  expect(status.getAttribute('role')).toBe('status');
  expect(status.textContent).toBe('Loading image');
  assertContract(root, {}, config, ['root', 'frame', 'img', 'status']);
});

test('error: an assertive alert overlay carries the message', async () => {
  const config: ImageConfig = { alignment: 'center', radius: 'lg', status: 'error' };
  const { container } = await render(
    <main>
      <Image src="https://example.com/broken.jpg" alt="Broken" status="error" />
    </main>,
  );
  const root = part(container, 'root') as HTMLElement;
  const status = part(root, 'status') as HTMLElement;
  expect(status.getAttribute('role')).toBe('alert');
  expect(status.textContent).toBe('Failed to load image');
  assertContract(root, {}, config, ['root', 'frame', 'img', 'status']);
});

test('the img onError flips the runtime status to error (React owns the lifecycle)', async () => {
  const { container } = await render(<Image src="https://example.com/broken.jpg" alt="Broken" />);
  const root = part(container, 'root') as HTMLElement;
  expect(part(root, 'status')).toBeNull();
  const img = part(root, 'img') as HTMLImageElement;
  img.dispatchEvent(new Event('error'));
  // The flip lives in React state, which a raw dispatched event flushes
  // asynchronously (unlike a callback invoked synchronously inside the
  // handler), so the DOM-attribute check polls briefly.
  await vi.waitFor(() => {
    const status = part(root, 'status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('alert');
    expect(status.textContent).toBe('Failed to load image');
  });
});

test('renders a figcaption when a caption is supplied', async () => {
  const { container } = await render(
    <Image src="https://example.com/photo.jpg" alt="Photo" caption="Photo by John Doe" />,
  );
  const root = part(container, 'root') as HTMLElement;
  const caption = part(root, 'caption') as HTMLElement;
  expect(caption.tagName).toBe('FIGCAPTION');
  expect(caption.textContent).toBe('Photo by John Doe');
});

test('a custom error message overrides the default', async () => {
  const { container } = await render(
    <Image src="https://example.com/x.jpg" alt="X" status="error" errorMessage="Unavailable" />,
  );
  const status = part(container, 'status') as HTMLElement;
  expect(status.textContent).toBe('Unavailable');
});
