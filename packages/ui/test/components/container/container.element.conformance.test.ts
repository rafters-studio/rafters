/**
 * WC render adapter + the shared container conformance suite (~10 lines,
 * test/harness/conformance.ts header). Importing container.element.ts
 * registers <rafters-container> idempotently (guarded internally).
 */
import { afterEach, describe, expect, it } from 'vitest';
import '../../../src/components/container/container.element';
import type { RenderResult } from '../../harness/conformance';
import {
  runContainerConformance,
  type ContainerAdapter,
  type ContainerScenarioProps,
} from './conformance-suite';

function renderContainer(props: ContainerScenarioProps, content: string): RenderResult {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const element = document.createElement('rafters-container');
  if (props.as) element.setAttribute('as', props.as);
  if (props.size) element.setAttribute('size', props.size);
  if (props.query === false) element.setAttribute('query', 'false');
  if (props.queryName) element.setAttribute('query-name', props.queryName);
  if (props.ariaLabel) element.setAttribute('aria-label', props.ariaLabel);
  element.textContent = content;
  host.appendChild(element);
  const root = element.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]');
  if (!root) throw new Error('wc adapter: no [data-part="root"] rendered');
  return { host, root, cleanup: () => host.remove() };
}

const wcAdapter: ContainerAdapter = {
  name: 'wc',
  supportsAriaLabelForward: false,
  render: renderContainer,
};

afterEach(() => {
  document.body.replaceChildren();
});

runContainerConformance(wcAdapter);

describe('container conformance [wc] framework-specific', () => {
  it('one tag, container and grid: nested rafters-container children slot through', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const combo = document.createElement('rafters-container');
    combo.setAttribute('as', 'section');
    combo.setAttribute('size', '6xl');
    combo.setAttribute('columns', '3');
    combo.setAttribute('gap', '6');
    const main = document.createElement('rafters-container');
    main.setAttribute('col-span', '2');
    main.textContent = 'main';
    const rail = document.createElement('rafters-container');
    rail.setAttribute('col-span', '1');
    rail.textContent = 'rail';
    combo.append(main, rail);
    host.appendChild(combo);

    const comboRoot = combo.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]');
    expect(comboRoot?.className).toContain('grid grid-cols-3');
    expect(comboRoot?.className).toContain('max-w-6xl');

    const mainRoot = main.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]');
    const railRoot = rail.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]');
    expect(mainRoot?.className).toContain('col-span-2');
    expect(railRoot?.className).toContain('col-span-1');

    host.remove();
  });

  it('consumer class attribute merges via classy onto the inner semantic element', () => {
    const result = renderContainer({}, 'x');
    result.host.querySelector('rafters-container')?.setAttribute('class', 'min-h-screen');
    const root = result.host
      .querySelector('rafters-container')
      ?.shadowRoot?.querySelector('[data-part="root"]');
    expect(root?.className).toContain('@container');
    expect(root?.className).toContain('min-h-screen');
    result.cleanup();
  });

  it('fill lands as data-fill on the semantic element', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const element = document.createElement('rafters-container');
    element.setAttribute('fill', 'muted');
    host.appendChild(element);
    const root = element.shadowRoot?.querySelector<HTMLElement>('[data-part="root"]');
    expect(root?.getAttribute('data-fill')).toBe('muted');
    host.remove();
  });
});
