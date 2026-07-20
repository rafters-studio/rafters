/**
 * WC performance of the accordion score, driven end to end against light-DOM
 * markup. Same score as the React conformance test -- the only difference is
 * that the controller applies the projection imperatively via bindAccordion,
 * seeding the intrinsic set from the server-rendered open sections.
 */
import { cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { RaftersAccordion } from '../../../src/components/accordion/accordion.element';
import { assertAxeClean } from '../../harness/conformance';

beforeAll(() => {
  if (!customElements.get('rafters-accordion')) {
    customElements.define('rafters-accordion', RaftersAccordion);
  }
});

interface MountOptions {
  type?: 'single' | 'multiple';
  collapsible?: boolean;
  open?: string[];
  disabled?: boolean;
  disabledItems?: string[];
  headingLevel?: number;
}

const SECTIONS: ReadonlyArray<[string, string]> = [
  ['a', 'Alpha'],
  ['b', 'Beta'],
  ['c', 'Gamma'],
];

function sectionMarkup(
  value: string,
  label: string,
  expanded: boolean,
  disabled: boolean,
  level: number,
): string {
  const state = expanded ? 'open' : 'closed';
  return `
    <div data-part="item" data-value="${value}" data-state="${state}">
      <div data-part="heading" data-value="${value}" role="heading" aria-level="${level}">
        <button type="button" id="acc-trigger-${value}" data-part="trigger" data-value="${value}"
                data-roving-item data-state="${state}" aria-expanded="${expanded}"
                aria-controls="acc-content-${value}"${disabled ? ' disabled' : ''}>${label}</button>
      </div>
      <div id="acc-content-${value}" data-part="content" data-value="${value}" role="region"
           aria-labelledby="acc-trigger-${value}" data-state="${state}"${expanded ? '' : ' hidden'}>
        Body ${label}
      </div>
    </div>`;
}

async function mount(options: MountOptions = {}): Promise<HTMLElement> {
  const {
    type = 'single',
    collapsible = false,
    open = [],
    disabled = false,
    disabledItems = [],
    headingLevel = 3,
  } = options;
  const sections = SECTIONS.map(([value, label]) =>
    sectionMarkup(
      value,
      label,
      open.includes(value),
      disabled || disabledItems.includes(value),
      headingLevel,
    ),
  ).join('');
  document.body.innerHTML = `
    <rafters-accordion>
      <div data-part="root" data-orientation="vertical" data-type="${type}" data-collapsible="${collapsible}" data-heading-level="${headingLevel}"${disabled ? ' data-disabled="true"' : ''}>
        ${sections}
      </div>
    </rafters-accordion>`;
  await Promise.resolve(); // let the element's deferred bind run
  return document.body.querySelector('[data-part="root"]') as HTMLElement;
}

const trigger = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="trigger"][data-value="${value}"]`)!;
const content = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="content"][data-value="${value}"]`)!;

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('accordion conformance [wc]', () => {
  it('seeds the intrinsic set from the server-rendered open section', async () => {
    await mount({ open: ['b'] });
    expect(trigger('b').getAttribute('aria-expanded')).toBe('true');
    expect(content('b').hasAttribute('hidden')).toBe(false);
    expect(trigger('a').getAttribute('aria-expanded')).toBe('false');
    expect(content('a').hasAttribute('hidden')).toBe(true);
    await assertAxeClean(document.body);
  });

  it('the panel is named by its header and referenced back, collapsed included', async () => {
    await mount();
    expect(trigger('a').getAttribute('aria-controls')).toBe(content('a').id);
    expect(content('a').getAttribute('aria-labelledby')).toBe(trigger('a').id);
  });

  it('single: clicking a header opens it and closes the previous one', async () => {
    const user = userEvent.setup();
    await mount({ open: ['a'] });
    await user.click(trigger('b'));
    expect(content('b').hasAttribute('hidden')).toBe(false);
    expect(content('a').hasAttribute('hidden')).toBe(true);
    expect(trigger('a').getAttribute('data-state')).toBe('closed');
  });

  it('single non-collapsible: re-clicking the open header keeps it open', async () => {
    const user = userEvent.setup();
    await mount({ open: ['a'] });
    await user.click(trigger('a'));
    expect(content('a').hasAttribute('hidden')).toBe(false);
  });

  it('single collapsible: re-clicking the open header collapses everything', async () => {
    const user = userEvent.setup();
    await mount({ open: ['a'], collapsible: true });
    await user.click(trigger('a'));
    expect(content('a').hasAttribute('hidden')).toBe(true);
  });

  it('multiple: sections accumulate and collapse independently', async () => {
    const user = userEvent.setup();
    await mount({ type: 'multiple' });
    await user.click(trigger('a'));
    await user.click(trigger('c'));
    expect(content('a').hasAttribute('hidden')).toBe(false);
    expect(content('c').hasAttribute('hidden')).toBe(false);
    await user.click(trigger('a'));
    expect(content('a').hasAttribute('hidden')).toBe(true);
    expect(content('c').hasAttribute('hidden')).toBe(false);
  });

  it('ArrowDown/ArrowUp rove focus with wrap; Home/End jump to the ends', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(trigger('b'));
    await user.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(trigger('a'));
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(trigger('c'));
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(trigger('a'));
  });

  it('arrow keys move focus ONLY -- expansion does not follow focus', async () => {
    const user = userEvent.setup();
    await mount();
    trigger('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(content('b').hasAttribute('hidden')).toBe(true);
  });

  it('Enter and Space on the focused header toggle it', async () => {
    const user = userEvent.setup();
    await mount({ type: 'multiple' });
    trigger('a').focus();
    await user.keyboard('{Enter}');
    expect(content('a').hasAttribute('hidden')).toBe(false);
    trigger('b').focus();
    await user.keyboard(' ');
    expect(content('b').hasAttribute('hidden')).toBe(false);
  });

  it('roving skips a disabled section and the click is refused', async () => {
    const user = userEvent.setup();
    await mount({ disabledItems: ['b'] });
    await user.click(trigger('b'));
    expect(content('b').hasAttribute('hidden')).toBe(true);
    trigger('a').focus();
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(trigger('c'));
  });

  it('a disabled accordion gates every section', async () => {
    const user = userEvent.setup();
    await mount({ disabled: true });
    await user.click(trigger('a'));
    expect(content('a').hasAttribute('hidden')).toBe(true);
  });

  it('disconnecting the element tears the binding down', async () => {
    const user = userEvent.setup();
    await mount();
    const host = document.body.querySelector('rafters-accordion') as HTMLElement;
    const headerA = trigger('a');
    const panelA = content('a');
    host.remove();
    document.body.append(panelA, headerA);
    await user.click(headerA);
    expect(panelA.hasAttribute('hidden')).toBe(true);
  });
});
