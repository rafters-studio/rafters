/**
 * Accessibility tests for <rafters-input-group> + <rafters-input-group-addon>.
 *
 * The group is a pure layout wrapper -- form semantics live on the slotted
 * input. axe-core >= 4 descends into open shadow roots automatically, so we
 * scope each assertion to a freshly mounted container to avoid the
 * document-level "region" rule firing on every test.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
// Side-effect import: augments `Assertion` with axe matchers (toHaveNoViolations).
import 'vitest-axe/extend-expect';
import './input-group.element';

let container: HTMLElement;

function mountContainer(): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * Build a labelled group with a native input so axe sees a complete form
 * control. Returns the mounted container for scoped axe scans.
 */
function buildLabelledGroup(
  attrs: {
    groupAttrs?: Record<string, string>;
    startAddon?: string | null;
    endAddon?: string | null;
    addonVariant?: 'default' | 'filled';
    disabled?: boolean;
    label?: string;
    inputId?: string;
    inputName?: string;
  } = {},
): HTMLElement {
  const label = document.createElement('label');
  label.setAttribute('for', attrs.inputId ?? 'group-input');
  label.textContent = attrs.label ?? 'Search';
  container.appendChild(label);

  const group = document.createElement('rafters-input-group');
  for (const [k, v] of Object.entries(attrs.groupAttrs ?? {})) {
    group.setAttribute(k, v);
  }
  if (attrs.disabled) group.toggleAttribute('disabled', true);

  if (attrs.startAddon !== null && attrs.startAddon !== undefined) {
    const start = document.createElement('rafters-input-group-addon');
    start.setAttribute('position', 'start');
    if (attrs.addonVariant) start.setAttribute('variant', attrs.addonVariant);
    start.textContent = attrs.startAddon;
    group.appendChild(start);
  }

  const input = document.createElement('input');
  input.id = attrs.inputId ?? 'group-input';
  input.name = attrs.inputName ?? 'query';
  input.type = 'text';
  group.appendChild(input);

  if (attrs.endAddon !== null && attrs.endAddon !== undefined) {
    const end = document.createElement('rafters-input-group-addon');
    end.setAttribute('position', 'end');
    if (attrs.addonVariant) end.setAttribute('variant', attrs.addonVariant);
    end.textContent = attrs.endAddon;
    group.appendChild(end);
  }

  container.appendChild(group);
  return container;
}

describe('<rafters-input-group> - Accessibility', () => {
  it('has no violations with a labelled input and start addon', async () => {
    mountContainer();
    buildLabelledGroup({ startAddon: '$', label: 'Price', inputName: 'price' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with start and end addons', async () => {
    mountContainer();
    buildLabelledGroup({ startAddon: '$', endAddon: 'USD', label: 'Price' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations across every size', async () => {
    const sizes: ReadonlyArray<string> = ['sm', 'default', 'lg'];
    for (const size of sizes) {
      mountContainer();
      buildLabelledGroup({ groupAttrs: { size }, startAddon: 'Find' });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      document.body.replaceChildren();
    }
  });

  it('has no violations when the group is disabled', async () => {
    mountContainer();
    buildLabelledGroup({ disabled: true, startAddon: 'Find' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with the filled addon variant', async () => {
    mountContainer();
    buildLabelledGroup({ startAddon: '@', addonVariant: 'filled', label: 'Username' });
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('addon host reflects data-position so styling is deterministic', () => {
    mountContainer();
    const addon = document.createElement('rafters-input-group-addon');
    addon.setAttribute('position', 'end');
    addon.textContent = 'USD';
    container.appendChild(addon);
    expect(addon.getAttribute('data-position')).toBe('end');
  });

  it('propagates disabled onto the slotted input so axe sees the state', () => {
    mountContainer();
    buildLabelledGroup({ disabled: true, startAddon: '$' });
    const input = container.querySelector('input');
    expect(input?.disabled).toBe(true);
  });

  it('has no violations inside a form with a submit control', async () => {
    mountContainer();
    const form = document.createElement('form');

    const label = document.createElement('label');
    label.setAttribute('for', 'amount');
    label.textContent = 'Amount';
    form.appendChild(label);

    const group = document.createElement('rafters-input-group');
    const start = document.createElement('rafters-input-group-addon');
    start.setAttribute('position', 'start');
    start.textContent = '$';
    group.appendChild(start);

    const input = document.createElement('input');
    input.id = 'amount';
    input.name = 'amount';
    input.type = 'number';
    group.appendChild(input);

    const end = document.createElement('rafters-input-group-addon');
    end.setAttribute('position', 'end');
    end.textContent = 'USD';
    group.appendChild(end);

    form.appendChild(group);

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Submit';
    form.appendChild(submit);

    container.appendChild(form);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
