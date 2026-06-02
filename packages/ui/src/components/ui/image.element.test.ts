import { afterEach, describe, expect, it } from 'vitest';
import './image.element';
import { imageAlignmentClasses, imageSizeClasses } from './image.classes';
import { composeImageClasses, RaftersImage } from './image.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement('rafters-image');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function figureClass(el: Element): string {
  return el.shadowRoot?.querySelector('figure')?.className ?? '';
}

const SAMPLE_SRC = 'https://example.com/photo.jpg';
const SAMPLE_SRC_ALT = 'https://example.com/other.jpg';

describe('<rafters-image>', () => {
  it('registers the rafters-image tag on import', () => {
    expect(customElements.get('rafters-image')).toBe(RaftersImage);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./image.element')).resolves.toBeDefined();
    await expect(import('./image.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-image')).toBe(RaftersImage);
  });

  it('renders a figure with an img child when src is set', () => {
    const el = mount({ src: SAMPLE_SRC, alt: 'A sunset' });
    const figure = el.shadowRoot?.querySelector('figure');
    expect(figure).not.toBeNull();
    const img = figure?.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(SAMPLE_SRC);
    expect(img?.getAttribute('alt')).toBe('A sunset');
  });

  it('renders an empty figure when src attribute is absent', () => {
    const el = mount();
    const figure = el.shadowRoot?.querySelector('figure');
    expect(figure).not.toBeNull();
    expect(figure?.querySelector('img')).toBeNull();
  });

  it('does not throw when rendered without any attributes', () => {
    expect(() => mount()).not.toThrow();
  });

  it('defaults alt to empty string when attribute is absent', () => {
    const el = mount({ src: SAMPLE_SRC });
    const img = el.shadowRoot?.querySelector('img');
    expect(img?.getAttribute('alt')).toBe('');
  });

  it('applies base + default full size + center alignment classes', () => {
    const el = mount({ src: SAMPLE_SRC });
    expect(figureClass(el)).toBe(composeImageClasses('full', 'center'));
  });

  it('falls back to full size and center alignment for unknown values', () => {
    const el = mount({ src: SAMPLE_SRC, size: 'gigantic', alignment: 'diagonal' });
    const css = figureClass(el);
    expect(css).toContain(imageSizeClasses.full);
    expect(css).toContain(imageAlignmentClasses.center);
  });

  it('applies the requested size when valid', () => {
    const el = mount({ src: SAMPLE_SRC, size: 'md' });
    expect(figureClass(el)).toContain(imageSizeClasses.md);
  });

  it('applies the requested alignment when valid', () => {
    const el = mount({ src: SAMPLE_SRC, alignment: 'left' });
    expect(figureClass(el)).toContain(imageAlignmentClasses.left);
  });

  it('reflects size changes on the inner class string', () => {
    const el = mount({ src: SAMPLE_SRC });
    expect(figureClass(el)).toContain(imageSizeClasses.full);
    el.setAttribute('size', 'lg');
    expect(figureClass(el)).toContain(imageSizeClasses.lg);
  });

  it('reflects alignment changes on the inner class string', () => {
    const el = mount({ src: SAMPLE_SRC });
    el.setAttribute('alignment', 'right');
    expect(figureClass(el)).toContain(imageAlignmentClasses.right);
  });

  it('reflects alt attribute changes to the img element', () => {
    const el = mount({ src: SAMPLE_SRC, alt: 'Initial' });
    el.setAttribute('alt', 'A sunset');
    const img = el.shadowRoot?.querySelector('img');
    expect(img?.alt).toBe('A sunset');
  });

  it('reflects src attribute changes to the img element', () => {
    const el = mount({ src: SAMPLE_SRC });
    el.setAttribute('src', SAMPLE_SRC_ALT);
    const img = el.shadowRoot?.querySelector('img');
    expect(img?.getAttribute('src')).toBe(SAMPLE_SRC_ALT);
  });

  it('reflects caption attribute changes to the figcaption textContent', () => {
    const el = mount({ src: SAMPLE_SRC });
    expect(el.shadowRoot?.querySelector('figcaption')).toBeNull();

    el.setAttribute('caption', 'Photo by John');
    const first = el.shadowRoot?.querySelector('figcaption');
    expect(first).not.toBeNull();
    expect(first?.textContent).toBe('Photo by John');

    el.setAttribute('caption', 'Updated');
    const second = el.shadowRoot?.querySelector('figcaption');
    expect(second?.textContent).toBe('Updated');

    el.removeAttribute('caption');
    expect(el.shadowRoot?.querySelector('figcaption')).toBeNull();
  });

  it('renders an initial figcaption when caption attribute is set at mount', () => {
    const el = mount({ src: SAMPLE_SRC, caption: 'Initial caption' });
    const figcaption = el.shadowRoot?.querySelector('figcaption');
    expect(figcaption?.textContent).toBe('Initial caption');
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersImage.observedAttributes).toEqual(['src', 'alt', 'size', 'alignment', 'caption']);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'image.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
