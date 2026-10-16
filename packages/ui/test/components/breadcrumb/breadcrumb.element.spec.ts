import { expect, it } from 'vitest';
import { breadcrumbIconClasses } from '../../../src/components/breadcrumb/breadcrumb.classes';
import { RaftersBreadcrumb } from '../../../src/components/breadcrumb/breadcrumb.element';

function mount(): HTMLElement {
  document.body.innerHTML =
    '<main><rafters-breadcrumb><ol>' +
    '<li><a href="/"><svg slot="start-icon"></svg>Home</a></li>' +
    '<li role="presentation" aria-hidden="true">/</li>' +
    '<li><span role="link" aria-disabled="true" aria-current="page">Docs<svg slot="end-icon"></svg></span></li>' +
    '</ol></rafters-breadcrumb></main>';
  const host = document.querySelector('rafters-breadcrumb');
  if (!(host instanceof HTMLElement)) throw new Error('rafters-breadcrumb did not mount');
  return host;
}

it('renders the nav landmark with one default slot on a display: contents host', () => {
  const host = mount();
  expect(host).toBeInstanceOf(RaftersBreadcrumb);
  expect(getComputedStyle(host).display).toBe('contents');
  const nav = host.shadowRoot?.querySelector('nav[data-part="root"]');
  expect(nav?.getAttribute('aria-label')).toBe('Breadcrumb');
  expect(nav?.hasAttribute('class')).toBe(false);
  expect(nav?.querySelectorAll('slot')).toHaveLength(1);
  expect(nav?.querySelector('slot')?.assignedElements()[0]?.tagName).toBe('OL');
});

it('wraps the start and end icons after a microtask', async () => {
  const host = mount();
  await Promise.resolve();
  const start = host.querySelector('a')?.firstElementChild;
  expect(start?.getAttribute('data-part')).toBe('startIcon');
  expect(start?.getAttribute('data-icon')).toBe('inline-start');
  expect(start?.getAttribute('aria-hidden')).toBe('true');
  expect(start?.className).toBe(breadcrumbIconClasses);
  const end = host.querySelector('[aria-current="page"]')?.lastElementChild;
  expect(end?.getAttribute('data-part')).toBe('endIcon');
  expect(end?.getAttribute('data-icon')).toBe('inline-end');
  expect(end?.getAttribute('aria-hidden')).toBe('true');
  expect(end?.className).toBe(breadcrumbIconClasses);
});
