import { afterEach, describe, expect, it } from 'vitest';
import './image.element';
import { RaftersImage } from './image.element';

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

function adoptedCssText(el: Element): string {
  const sheets = el.shadowRoot?.adoptedStyleSheets ?? [];
  const blocks: string[] = [];
  for (const sheet of sheets) {
    const rules: string[] = [];
    for (const rule of Array.from(sheet.cssRules)) {
      rules.push(rule.cssText);
    }
    blocks.push(rules.join('\n'));
  }
  return blocks.join('\n');
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

  it('renders a figure.image with an img child when src is set', () => {
    const el = mount({ src: SAMPLE_SRC, alt: 'A sunset' });
    const figure = el.shadowRoot?.querySelector('figure.image');
    expect(figure).not.toBeNull();
    const img = figure?.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(SAMPLE_SRC);
    expect(img?.getAttribute('alt')).toBe('A sunset');
  });

  it('renders an empty figure when src attribute is absent', () => {
    const el = mount();
    const figure = el.shadowRoot?.querySelector('figure.image');
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

  it('falls back to full size and center alignment for unknown values', () => {
    const el = mount({ src: SAMPLE_SRC, size: 'gigantic', alignment: 'diagonal' });
    const css = adoptedCssText(el);
    // full -> max-width: 100%
    expect(css).toContain('max-width: 100%');
    // center -> margin-left: auto; margin-right: auto (jsdom serialises to
    // the `margin` shorthand "0px auto").
    expect(css).toMatch(/margin:\s*0px\s+auto/);
  });

  it('applies the requested size when valid', () => {
    const el = mount({ src: SAMPLE_SRC, size: 'md' });
    expect(adoptedCssText(el)).toContain('max-width: 28rem');
  });

  it('applies the requested alignment when valid', () => {
    const el = mount({ src: SAMPLE_SRC, alignment: 'left' });
    const css = adoptedCssText(el);
    // left -> margin-left: 0; margin-right: auto (jsdom shorthand
    // "0px auto 0px 0px": top right bottom left).
    expect(css).toMatch(/margin:\s*0px\s+auto\s+0px\s+0px/);
  });

  it('reflects size changes on the adopted stylesheet', () => {
    const el = mount({ src: SAMPLE_SRC });
    expect(adoptedCssText(el)).toContain('max-width: 100%');
    el.setAttribute('size', 'lg');
    expect(adoptedCssText(el)).toContain('max-width: 32rem');
  });

  it('reflects alignment changes on the adopted stylesheet', () => {
    const el = mount({ src: SAMPLE_SRC });
    el.setAttribute('alignment', 'right');
    const css = adoptedCssText(el);
    // right -> margin-left: auto; margin-right: 0 (jsdom shorthand
    // "0px 0px 0px auto": top right bottom left).
    expect(css).toMatch(/margin:\s*0px\s+0px\s+0px\s+auto/);
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
    // No caption yet, no figcaption in DOM.
    expect(el.shadowRoot?.querySelector('figcaption')).toBeNull();

    // Setting caption inserts the figcaption with matching textContent.
    el.setAttribute('caption', 'Photo by John');
    const first = el.shadowRoot?.querySelector('figcaption');
    expect(first).not.toBeNull();
    expect(first?.textContent).toBe('Photo by John');

    // Updating caption updates the same node's textContent.
    el.setAttribute('caption', 'Updated');
    const second = el.shadowRoot?.querySelector('figcaption');
    expect(second?.textContent).toBe('Updated');

    // Removing caption drops the figcaption from the DOM.
    el.removeAttribute('caption');
    expect(el.shadowRoot?.querySelector('figcaption')).toBeNull();
  });

  it('renders an initial figcaption when caption attribute is set at mount', () => {
    const el = mount({ src: SAMPLE_SRC, caption: 'Initial caption' });
    const figcaption = el.shadowRoot?.querySelector('figcaption.image-caption');
    expect(figcaption?.textContent).toBe('Initial caption');
  });

  it('observedAttributes matches the documented contract', () => {
    expect(RaftersImage.observedAttributes).toEqual(['src', 'alt', 'size', 'alignment', 'caption']);
  });

  it('uses only --motion-duration / --motion-ease tokens (never bare --duration/--ease)', () => {
    const el = mount({ src: SAMPLE_SRC });
    const css = adoptedCssText(el);
    expect(css).not.toMatch(/var\(--duration-/);
    expect(css).not.toMatch(/var\(--ease-/);
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'image.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
