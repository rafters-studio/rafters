/**
 * WC decorator of the Image score, driven against light-DOM markup. Same score
 * as the React and Astro conformances: the host renders a real
 * <figure data-part="root"> and bindImage applies the aria projection. Proves
 * the static projection drives identically through the DOM binding, and that a
 * live attribute change re-derives config.
 */
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { RaftersImage } from '../../../src/components/image/image.element';
import { image, type ImageConfig } from '../../../src/components/image/image.behavior';
import { assertContractFulfillment, partElement } from '../../harness/conformance';

const SRC = 'https://example.com/photo.jpg';

beforeAll(() => {
  if (!customElements.get('rafters-image')) {
    customElements.define('rafters-image', RaftersImage);
  }
});

async function mount(attrs = ''): Promise<HTMLElement> {
  document.body.innerHTML = `<main><rafters-image ${attrs}></rafters-image></main>`;
  await Promise.resolve(); // let the element's deferred build + bind run
  return partElement(document.body, 'root') as HTMLElement;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('image conformance [wc]', () => {
  it('loaded: renders a real figure/img, no overlay, projection fulfilled', async () => {
    const root = await mount(`src="${SRC}" alt="A sunset"`);
    expect(root.tagName).toBe('FIGURE');
    const img = partElement(root, 'img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe(SRC);
    expect(img.getAttribute('alt')).toBe('A sunset');
    expect(img.hasAttribute('aria-busy')).toBe(false);
    expect(partElement(root, 'status')).toBeNull();
    const config: ImageConfig = { status: 'loaded' };
    assertContractFulfillment(image, root, {}, config, ['root', 'frame', 'img']);
  });

  it('defaults alt to empty string when the attribute is absent', async () => {
    const root = await mount(`src="${SRC}"`);
    const img = partElement(root, 'img') as HTMLImageElement;
    expect(img.getAttribute('alt')).toBe('');
  });

  it('loading: the img is aria-busy and the overlay is role="status"', async () => {
    const root = await mount(`src="${SRC}" alt="Loading" data-status="loading"`);
    const img = partElement(root, 'img') as HTMLElement;
    expect(img.getAttribute('aria-busy')).toBe('true');
    const status = partElement(root, 'status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe('Loading image');
    assertContractFulfillment(image, root, {}, { status: 'loading' }, [
      'root',
      'frame',
      'img',
      'status',
    ]);
  });

  it('error: the overlay is role="alert" carrying the message', async () => {
    const root = await mount(
      `src="${SRC}" alt="Broken" data-status="error" data-error-message="Gone"`,
    );
    const status = partElement(root, 'status') as HTMLElement;
    expect(status.getAttribute('role')).toBe('alert');
    expect(status.textContent).toBe('Gone');
  });

  it('renders a real figcaption when the caption attribute is set', async () => {
    const root = await mount(`src="${SRC}" alt="Photo" caption="Photo by John"`);
    const caption = partElement(root, 'caption') as HTMLElement;
    expect(caption.tagName).toBe('FIGCAPTION');
    expect(caption.textContent).toBe('Photo by John');
  });

  it('a live status change re-derives the projection (loading -> loaded)', async () => {
    await mount(`src="${SRC}" alt="Photo" data-status="loading"`);
    const host = document.querySelector('rafters-image') as HTMLElement;
    expect((partElement(document.body, 'img') as HTMLElement).getAttribute('aria-busy')).toBe(
      'true',
    );
    host.setAttribute('data-status', 'loaded');
    await Promise.resolve();
    const img = partElement(document.body, 'img') as HTMLElement;
    expect(img.hasAttribute('aria-busy')).toBe(false);
    expect(partElement(document.body, 'status')).toBeNull();
    // The figure is rebuilt in place, not duplicated.
    expect(document.querySelectorAll('[data-part="root"]')).toHaveLength(1);
  });

  it('is axe-clean with alt text inside a landmark', async () => {
    await mount(`src="${SRC}" alt="A sunset over the ocean"`);
    const results = await axe(document.body);
    expect(results.violations).toEqual([]);
  });
});
