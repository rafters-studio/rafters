import { afterEach, describe, expect, it } from 'vitest';
import {
  breadcrumbEllipsisClasses,
  breadcrumbItemClasses,
  breadcrumbLinkClasses,
  breadcrumbListClasses,
  breadcrumbPageClasses,
  breadcrumbSeparatorClasses,
} from './breadcrumb.classes';
import './breadcrumb.element';
import { RaftersBreadcrumb } from './breadcrumb.element';

afterEach(() => {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
});

function mount(): HTMLElement {
  const el = document.createElement('rafters-breadcrumb');
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

describe('<rafters-breadcrumb>', () => {
  it('registers the rafters-breadcrumb tag on import', () => {
    expect(customElements.get('rafters-breadcrumb')).toBe(RaftersBreadcrumb);
  });

  it('does not throw when the module is imported twice', async () => {
    await expect(import('./breadcrumb.element')).resolves.toBeDefined();
    await expect(import('./breadcrumb.element')).resolves.toBeDefined();
    expect(customElements.get('rafters-breadcrumb')).toBe(RaftersBreadcrumb);
  });

  it('renders a single nav[aria-label="Breadcrumb"] containing a slot', () => {
    const el = mount();
    const navs = el.shadowRoot?.querySelectorAll('nav') ?? [];
    expect(navs.length).toBe(1);
    const nav = navs[0];
    expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb');
    expect(nav?.children.length).toBe(1);
    expect(nav?.firstElementChild?.tagName.toLowerCase()).toBe('slot');
  });

  it('observedAttributes is empty', () => {
    expect(RaftersBreadcrumb.observedAttributes).toEqual([]);
  });

  it('keeps the irreducible host block rule in the adopted sheet', () => {
    const el = mount();
    const css = adoptedCssText(el);
    expect(css).toMatch(/:host\s*{[^}]*display:\s*block/);
  });

  it('exposes the shared descendant utility class strings for slotted children', () => {
    // The outer nav carries no classes; the list/item/link/page/separator/
    // ellipsis rhythm comes from these shared utility strings on the consumer's
    // slotted children, parallel to the React/Astro targets.
    expect(breadcrumbListClasses).toContain('text-muted-foreground');
    expect(breadcrumbItemClasses).toContain('inline-flex');
    expect(breadcrumbLinkClasses).toContain('hover:text-foreground');
    expect(breadcrumbPageClasses).toContain('text-foreground');
    expect(breadcrumbSeparatorClasses).toContain('size-3.5');
    expect(breadcrumbEllipsisClasses).toContain('items-center');
  });

  it('source contains no direct var() references', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const source = await fs.readFile(path.resolve(__dirname, 'breadcrumb.element.ts'), 'utf-8');
    expect(source).not.toMatch(/[^a-zA-Z_]var\(/);
  });
});
