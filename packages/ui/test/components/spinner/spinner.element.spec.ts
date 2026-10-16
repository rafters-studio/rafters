import { expect, it } from 'vitest';
import '../../../src/components/spinner/spinner.element';
import { spinner, type SpinnerConfig } from '../../../src/components/spinner/spinner.behavior';
import { spinnerClasses } from '../../../src/components/spinner/spinner.classes';

function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  const el = document.body.querySelector('rafters-spinner');
  if (!(el instanceof HTMLElement)) throw new Error('rafters-spinner did not mount');
  return el;
}

function expectPerforms(el: HTMLElement, config: SpinnerConfig): void {
  expect(el.shadowRoot?.children.length).toBe(1);
  expect(el.shadowRoot?.querySelector('slot')).toBeNull();
  const root = el.shadowRoot?.querySelector('output[data-part="root"]');
  if (!(root instanceof HTMLElement)) throw new Error('no root part');
  expect(root.className).toBe(spinnerClasses(config, {}).root);
  for (const [key, value] of Object.entries(spinner.aria({}, config, { root: '' }).root ?? {})) {
    expect(root.getAttribute(key)).toBe(value === undefined ? null : String(value));
  }
  expect(root.hasAttribute('role')).toBe(false);
  expect(root.children.length).toBe(0);
}

it('performs the default spinner', () => {
  expectPerforms(mount('<rafters-spinner></rafters-spinner>'), {});
});

it('performs size and variant', () => {
  expectPerforms(mount('<rafters-spinner size="lg" variant="muted"></rafters-spinner>'), {
    size: 'lg',
    variant: 'muted',
  });
});

it('performs every size and variant', () => {
  const sizes = ['sm', 'default', 'lg'] as const;
  const variants = [
    'default',
    'primary',
    'secondary',
    'destructive',
    'success',
    'warning',
    'info',
    'accent',
    'muted',
  ] as const;
  for (const size of sizes) {
    for (const variant of variants) {
      expectPerforms(
        mount(`<rafters-spinner size="${size}" variant="${variant}"></rafters-spinner>`),
        { size, variant },
      );
    }
  }
});

it('re-renders on attribute change', () => {
  const el = mount('<rafters-spinner></rafters-spinner>');
  el.setAttribute('size', 'sm');
  expectPerforms(el, { size: 'sm' });
  el.setAttribute('variant', 'primary');
  expectPerforms(el, { size: 'sm', variant: 'primary' });
});

it('renders default classes for invalid size and variant', () => {
  expectPerforms(mount('<rafters-spinner size="huge" variant="nope"></rafters-spinner>'), {});
});
