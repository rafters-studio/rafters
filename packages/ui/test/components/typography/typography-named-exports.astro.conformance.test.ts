/**
 * The Astro DROP-IN SURFACE for typography (#2325): the 20 names
 * typography.tsx exports, served by the SAME single typography.astro file as
 * hoisted createComponent exports next to its default `<Typography as>`.
 *
 * Every assertion reads attributes and text off a parsed document rather than
 * comparing raw HTML: Astro 7 defaults compressHTML to 'jsx', so inter-element
 * whitespace differs across majors. The HTML is parsed with happy-dom's own
 * Window instead of the test environment's globals, because from Astro 6 the
 * Container API renders only under vitest `environment: 'node'`.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';
import type { TypographyVariant } from '../../../src/components/typography/typography.behavior';
import { resolveTypography } from '../../../src/components/typography/typography.classes';
import Typography, {
  Abbr,
  Blockquote,
  Code,
  CodeBlock,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  Large,
  Lead,
  Li,
  List,
  Mark,
  Muted,
  Ol,
  P,
  Small,
  Ul,
} from '../../../src/components/typography/typography.astro';

interface Rendered {
  html: string;
  root: Element;
  /** The root's class attribute as a browser reads it. */
  className: string;
}

/**
 * Astro's `addAttribute` -- the call the compiler emits for `class={classes}`
 * and the one the named exports make -- escapes `&` and `"` in attribute
 * values as numeric references. A browser decodes those back; happy-dom
 * 20 leaves numeric references in attributes undecoded, so `[&>li]` reads
 * back as `[&#38;>li]`. Undo exactly Astro's two escapes.
 */
function decodeAttribute(value: string): string {
  return value.replaceAll('&#38;', '&').replaceAll('&#34;', '"');
}

async function renderComponent(
  Component: unknown,
  props: Record<string, unknown> = {},
  slot = 'content',
): Promise<Rendered> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Component as AstroComponentFactory, {
    props,
    slots: { default: slot },
  });
  const window = new Window();
  window.document.body.innerHTML = html;
  const root = window.document.body.querySelector('[data-part="root"]');
  if (!root) throw new Error(`no data-part="root" element in: ${html}`);
  return {
    html,
    root: root as unknown as Element,
    className: decodeAttribute(root.getAttribute('class') ?? ''),
  };
}

/** Name -> [component, rendered tag, variant] -- the table typography.tsx:111-137 encodes. */
const NAMED: Array<[string, unknown, string, TypographyVariant]> = [
  ['H1', H1, 'h1', 'h1'],
  ['H2', H2, 'h2', 'h2'],
  ['H3', H3, 'h3', 'h3'],
  ['H4', H4, 'h4', 'h4'],
  ['H5', H5, 'h5', 'h4'],
  ['H6', H6, 'h6', 'h4'],
  ['P', P, 'p', 'p'],
  ['Lead', Lead, 'p', 'lead'],
  ['Large', Large, 'p', 'large'],
  ['Muted', Muted, 'p', 'muted'],
  ['Small', Small, 'small', 'small'],
  ['Code', Code, 'code', 'code'],
  ['CodeBlock', CodeBlock, 'pre', 'codeblock'],
  ['Blockquote', Blockquote, 'blockquote', 'blockquote'],
  ['Mark', Mark, 'mark', 'mark'],
  ['Abbr', Abbr, 'abbr', 'abbr'],
  ['Ul', Ul, 'ul', 'ul'],
  ['Ol', Ol, 'ol', 'ol'],
  ['Li', Li, 'li', 'li'],
  ['List', List, 'ul', 'ul'],
];

describe('typography named exports [astro drop-in surface]', () => {
  it('all 20 names resolve to component factories from the one file', () => {
    expect(NAMED).toHaveLength(20);
    for (const [name, component] of NAMED) {
      expect(typeof component, name).toBe('function');
    }
    expect(List).toBe(Ul);
  });

  it.each(NAMED)(
    '%s renders its React counterpart tag and projection',
    async (_name, component, tag, variant) => {
      const { root, className } = await renderComponent(component, {}, 'Title');
      expect(root.tagName.toLowerCase()).toBe(tag);
      expect(className).toBe(resolveTypography(variant, {}));
      expect(root.textContent).toBe('Title');
    },
  );

  it('CodeBlock nests its content in a <code> inside the <pre> root', async () => {
    const { root } = await renderComponent(CodeBlock, {}, 'const x = 1;');
    expect(root.tagName.toLowerCase()).toBe('pre');
    expect(root.children).toHaveLength(1);
    const code = root.firstElementChild;
    expect(code?.tagName.toLowerCase()).toBe('code');
    expect(code?.textContent).toBe('const x = 1;');
  });

  it('token props resolve on a named export exactly as resolveTypography resolves them', async () => {
    const { className } = await renderComponent(P, { size: 'xl', color: 'muted' });
    expect(className).toBe(resolveTypography('p', { size: 'xl', color: 'muted' }));
  });

  it('every token dimension overrides its variant default on a named export', async () => {
    const tokens = {
      size: '2xl',
      weight: 'light',
      color: 'accent',
      line: 'tight',
      tracking: 'wide',
      family: 'serif',
      align: 'center',
      transform: 'uppercase',
    };
    const { className } = await renderComponent(H1, tokens);
    expect(className).toBe(resolveTypography('h1', tokens));
    // The h1 size override replaces text-4xl AND suppresses the CQ scale on
    // the same dimension, the same way it does on the default export.
    expect(className).toContain('text-2xl');
    expect(className).not.toContain('text-4xl');
    expect(className).not.toContain('@lg:text-5xl');
  });

  it('a consumer class is discarded silently and survives nowhere -- not via the rest spread', async () => {
    const warn = vi.spyOn(console, 'warn');
    const error = vi.spyOn(console, 'error');
    const { className, html } = await renderComponent(H1, { class: 'bg-red-500' });
    expect(className).toBe(resolveTypography('h1', {}));
    expect(html).not.toContain('bg-red-500');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });

  it('class is discarded on every named export', async () => {
    for (const [name, component, , variant] of NAMED) {
      const { className, html } = await renderComponent(component, { class: 'mt-4' });
      expect(className, name).toBe(resolveTypography(variant, {}));
      expect(html, name).not.toContain('mt-4');
    }
  });

  it('other attributes pass through the rest spread after the resolved class', async () => {
    const { root, className } = await renderComponent(Abbr, {
      id: 'html',
      title: 'HyperText Markup Language',
    });
    expect(root.getAttribute('id')).toBe('html');
    expect(root.getAttribute('title')).toBe('HyperText Markup Language');
    expect(className).toBe(resolveTypography('abbr', {}));
  });
});

describe('typography default export is unchanged beside the named surface', () => {
  it.each([
    ['p', 'p'],
    ['h2', 'h2'],
    ['h5', 'h4'],
    ['span', 'p'],
  ] as const)(
    '<Typography as="%s"> renders that tag with the %s projection',
    async (as, variant) => {
      const { root, className } = await renderComponent(Typography, { as });
      expect(root.tagName.toLowerCase()).toBe(as);
      expect(className).toBe(resolveTypography(variant, {}));
      expect(root.textContent).toBe('content');
    },
  );

  it('the default and the named export of the same element render the same class string', async () => {
    const generic = await renderComponent(Typography, { as: 'h2', size: 'xl' });
    const named = await renderComponent(H2, { size: 'xl' });
    expect(named.className).toBe(generic.className);
    expect(named.root.getAttribute('class')).toBe(generic.root.getAttribute('class'));
  });
});
