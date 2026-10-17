import { expect, it } from 'vitest';
import '../../../src/components/typography/typography.element';
import {
  variantToTag,
  type TypographyTokenProps,
  type TypographyVariant,
} from '../../../src/components/typography/typography.behavior';
import { resolveTypography } from '../../../src/components/typography/typography.classes';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.querySelector('rafters-typography');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-typography did not mount');
  return el;
}

function rootOf(el: HTMLElement): HTMLElement {
  expect(el.shadowRoot?.children.length).toBe(1);
  const root = el.shadowRoot?.querySelector('[data-part="root"]');
  if (!(root instanceof HTMLElement)) throw new Error('no root part');
  return root;
}

it('defaults to a body paragraph with slotted content', () => {
  const root = rootOf(mount('<rafters-typography>Body</rafters-typography>'));
  expect(root.tagName).toBe('P');
  expect(root.className).toBe(resolveTypography('p', {}));
  const slot = root.querySelector('slot');
  expect(slot?.assignedNodes()[0]?.textContent).toBe('Body');
});

it('renders the variant tag with replaced token dimensions', () => {
  const root = rootOf(
    mount('<rafters-typography variant="h1" size="2xl">Title</rafters-typography>'),
  );
  expect(root.tagName).toBe(variantToTag.h1.toUpperCase());
  expect(root.className).toBe(resolveTypography('h1', { size: '2xl' }));
  expect(root.className).not.toBe(resolveTypography('h1', {}));
  expect(root.getAttribute('role')).toBeNull();
});

it('codeblock nests the slot in pre > code', () => {
  const root = rootOf(
    mount('<rafters-typography variant="codeblock">let x = 1;</rafters-typography>'),
  );
  expect(root.tagName).toBe('PRE');
  expect(root.querySelector(':scope > code > slot')).not.toBeNull();
});

it('falls back to p for an unknown variant and re-renders on change', () => {
  const el = mount('<rafters-typography variant="nope">x</rafters-typography>');
  expect(rootOf(el).tagName).toBe('P');
  el.setAttribute('variant', 'blockquote');
  expect(rootOf(el).tagName).toBe('BLOCKQUOTE');
  expect(rootOf(el).className).toBe(resolveTypography('blockquote', {}));
});

const variants = Object.keys(variantToTag) as TypographyVariant[];
for (const variant of variants) {
  it(`variant ${variant} renders its tag and classes`, () => {
    const root = rootOf(mount(`<rafters-typography variant="${variant}">x</rafters-typography>`));
    expect(root.tagName).toBe(variantToTag[variant].toUpperCase());
    expect(root.className).toBe(resolveTypography(variant, {}));
    expect(root.querySelector('slot')).not.toBeNull();
    for (const attr of root.getAttributeNames()) {
      expect(attr === 'role' || attr.startsWith('aria-')).toBe(false);
    }
  });
}

const tokenCases: ReadonlyArray<[keyof TypographyTokenProps, string]> = [
  ['size', 'xl'],
  ['weight', 'bold'],
  ['color', 'muted-foreground'],
  ['line', 'tight'],
  ['tracking', 'wide'],
  ['family', 'mono'],
  ['align', 'center'],
  ['transform', 'uppercase'],
];
for (const [token, value] of tokenCases) {
  it(`token attribute ${token} drives the class`, () => {
    const root = rootOf(
      mount(`<rafters-typography variant="p" ${token}="${value}">x</rafters-typography>`),
    );
    expect(root.className).toBe(resolveTypography('p', { [token]: value }));
  });
}

it('re-renders when a token attribute changes after connection', () => {
  const el = mount('<rafters-typography variant="h1">x</rafters-typography>');
  el.setAttribute('size', '2xl');
  expect(rootOf(el).className).toBe(resolveTypography('h1', { size: '2xl' }));
  el.removeAttribute('size');
  expect(rootOf(el).className).toBe(resolveTypography('h1', {}));
});
