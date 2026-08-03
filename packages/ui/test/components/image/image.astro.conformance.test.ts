/**
 * Astro decorator of the Image score. Image is a STATIC score, but its ARIA
 * projection is LIVE (aria-busy / the overlay role), so this test drives it end
 * to end. AstroContainer renders the SSR markup but does NOT run the <script>,
 * so the test calls bindImage directly -- that IS the script's job.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, it } from 'vitest';
import Image from '../../../src/components/image/image.astro';
import { bindImage, image, type ImageConfig } from '../../../src/components/image/image.behavior';
import {
  assertAxeClean,
  assertConfigTravelsAsData,
  assertContractFulfillment,
  partElement,
} from '../../harness/conformance';

const SRC = 'https://example.com/photo.jpg';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown>): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Image, { props });
  document.body.innerHTML = `<main>${html}</main>`;
  const root = document.body.querySelector('[data-part="root"][data-image]') as HTMLElement;
  bindImage(root); // the <script> does this per instance on the real page
  return root;
}

describe('image conformance [astro]', () => {
  it('loaded: SSR markup carries the figure/img contract, bind re-affirms', async () => {
    const root = await mount({ src: SRC, alt: 'A sunset over the ocean' });
    expect(root.tagName).toBe('FIGURE');
    const img = partElement(root, 'img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(SRC);
    expect(img.getAttribute('alt')).toBe('A sunset over the ocean');
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.hasAttribute('aria-busy')).toBe(false);
    expect(partElement(root, 'status')).toBeNull();
    const config: ImageConfig = { alignment: 'center', radius: 'lg', status: 'loaded' };
    assertContractFulfillment(image, root, {}, config, ['root', 'frame', 'img']);
    await assertAxeClean(document.body);
  });

  it('loading: the img is aria-busy and the overlay is role="status"', async () => {
    const root = await mount({ src: SRC, alt: 'Loading', status: 'loading' });
    const img = partElement(root, 'img') as HTMLElement;
    expect(img.getAttribute('aria-busy')).toBe('true');
    const status = partElement(root, 'status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent?.trim()).toBe('Loading image');
    await assertAxeClean(document.body);
  });

  it('error: the overlay is role="alert" carrying the message', async () => {
    const root = await mount({ src: SRC, alt: 'Broken', status: 'error', errorMessage: 'Gone' });
    const status = partElement(root, 'status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('alert');
    expect(status.textContent?.trim()).toBe('Gone');
  });

  it('renders a real figcaption when a caption is supplied', async () => {
    const root = await mount({ src: SRC, alt: 'Photo', caption: 'Photo by John Doe' });
    const caption = partElement(root, 'caption') as HTMLElement;
    expect(caption.tagName).toBe('FIGCAPTION');
    expect(caption.textContent?.trim()).toBe('Photo by John Doe');
  });

  it('consumer class merges via classy', async () => {
    const root = await mount({ src: SRC, alt: 'Photo', radius: '2xl', class: 'my-4' });
    // The figure carries base + alignment; the radius token lands on the frame.
    expect(root.className).toContain('mx-auto');
    expect(root.className).toContain('my-4');
    const frame = partElement(root, 'frame') as HTMLElement;
    expect(frame.className).toContain('rounded-2xl');
  });

  // The #2001 pairing: config is data-* in the markup AND read through dataset
  // in the bind. `size` and `fill` are real platform attributes elsewhere, so
  // the bare spellings must not appear on the <figure> at all.
  it('config crosses the SSR/bind seam as data-* only, and rehydration still works', async () => {
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

    assertConfigTravelsAsData(root, {
      size: 'md',
      alignment: 'left',
      radius: '2xl',
      fill: 'muted',
      status: 'error',
      errorMessage: 'Gone',
      loadingLabel: 'Wait',
    });

    // Rehydration: wipe the projected role, re-bind, and it comes back -- which
    // it can only do by reconstructing `status` from dataset.
    const status = partElement(root, 'status') as HTMLElement;
    status.removeAttribute('role');
    bindImage(root);
    expect(status.getAttribute('role')).toBe('alert');
    expect(status.textContent?.trim()).toBe('Gone');
  });
});
