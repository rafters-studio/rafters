import { expect, it } from 'vitest';
import '../../../src/components/container/container.element';
import { containerClasses } from '../../../src/components/container/container.classes';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.querySelector('rafters-container');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-container did not mount');
  return el;
}

function rootOf(el: HTMLElement): HTMLElement {
  const root = el.shadowRoot?.querySelector('[data-part="root"]');
  if (!(root instanceof HTMLElement)) throw new Error('no root part');
  return root;
}

it('renders the as element with classes, query-name, one slot, and a contents host', () => {
  const host = mount(
    '<rafters-container as="main" size="6xl" query-name="rail"><p>Body</p></rafters-container>',
  );
  const root = rootOf(host);
  expect(root.tagName.toLowerCase()).toBe('main');
  expect(root.className).toBe(
    containerClasses({ as: 'main', size: '6xl', query: true, queryName: 'rail' }, {}).root,
  );
  expect(root.style.containerName).toBe('rail');
  expect(root.getAttribute('role')).toBeNull();
  const slots = root.querySelectorAll('slot');
  expect(slots.length).toBe(1);
  const text = slots[0]
    ?.assignedNodes({ flatten: true })
    .map((n) => n.textContent)
    .join('');
  expect(text).toContain('Body');
  expect(getComputedStyle(host).display).toBe('contents');
});

it('defaults to a div', () => {
  const root = rootOf(mount('<rafters-container></rafters-container>'));
  expect(root.tagName.toLowerCase()).toBe('div');
  expect(root.className).toBe(containerClasses({ as: 'div', query: true }, {}).root);
});

it('re-renders on columns and an unknown as renders a div', () => {
  const host = mount('<rafters-container as="main" size="6xl"></rafters-container>');
  host.setAttribute('columns', '3');
  expect(rootOf(host).className).toBe(
    containerClasses({ as: 'main', size: '6xl', columns: 3, query: true }, {}).root,
  );
  host.setAttribute('as', 'script');
  expect(rootOf(host).tagName.toLowerCase()).toBe('div');
});

it('reads section and size', () => {
  const root = rootOf(mount('<rafters-container as="section" size="6xl"></rafters-container>'));
  expect(root.className).toBe(
    containerClasses({ as: 'section', size: '6xl', query: true }, {}).root,
  );
});

it('gap attribute forms', () => {
  expect(rootOf(mount('<rafters-container size="lg" gap></rafters-container>')).className).toBe(
    containerClasses({ as: 'div', size: 'lg', gap: true, query: true }, {}).root,
  );
  expect(
    rootOf(mount('<rafters-container size="lg" gap="false"></rafters-container>')).className,
  ).toBe(containerClasses({ as: 'div', size: 'lg', gap: false, query: true }, {}).root);
  expect(rootOf(mount('<rafters-container gap="4"></rafters-container>')).className).toBe(
    containerClasses({ as: 'div', gap: '4', query: true }, {}).root,
  );
});

it('query="false" drops the provider', () => {
  expect(rootOf(mount('<rafters-container query="false"></rafters-container>')).className).toBe(
    containerClasses({ as: 'div', query: false }, {}).root,
  );
});

it('col-span, row-span, position, depth map to config', () => {
  const root = rootOf(
    mount(
      '<rafters-container col-span="2" row-span="2" position="sticky" depth="navigation"></rafters-container>',
    ),
  );
  expect(root.className).toBe(
    containerClasses(
      { as: 'div', colSpan: 2, rowSpan: 2, position: 'sticky', depth: 'navigation', query: true },
      {},
    ).root,
  );
});

it('fill sets data-fill', () => {
  const root = rootOf(mount('<rafters-container fill="primary"></rafters-container>'));
  expect(root.getAttribute('data-fill')).toBe('primary');
  expect(root.className).toBe(
    containerClasses({ as: 'div', fill: 'primary', query: true }, {}).root,
  );
});

it('unknown vocabulary values contribute no class and do not throw', () => {
  const root = rootOf(
    mount('<rafters-container size="huge" padding="x" position="y" depth="z"></rafters-container>'),
  );
  expect(root.className).toBe(containerClasses({ as: 'div', query: true }, {}).root);
});
