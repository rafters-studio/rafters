/**
 * Astro performance of the toggle-group score, driven end to end. AstroContainer
 * renders the SSR markup with the initial projection already applied, but does
 * NOT run the <script>, so the test calls bindToggleGroup directly -- that IS the
 * script's job -- then drives the same score the React and WC performances drive.
 * One score, three performances.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import ToggleGroup from '../../../src/components/toggle-group/toggle-group.astro';
import { bindToggleGroup } from '../../../src/components/toggle-group/toggle-group.behavior';

const items = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(ToggleGroup, {
    props: { id: 'tg', items, ...props },
  });
  document.body.innerHTML = html;
  const root = document.body.querySelector('[data-part="root"][role="group"]') as HTMLElement;
  bindToggleGroup(root); // the <script> does this per instance on the real page
  return root;
}

const item = (value: string) =>
  document.body.querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`)!;

describe('toggle-group [astro]', () => {
  it('SSR: group + toggle items, the seeded value pressed, orientation reflected', async () => {
    await mount({ value: 'b', orientation: 'vertical' });
    const root = document.body.querySelector('[data-part="root"]');
    expect(root?.getAttribute('role')).toBe('group');
    expect(root?.getAttribute('data-orientation')).toBe('vertical');
    expect(item('b').getAttribute('aria-pressed')).toBe('true');
    expect(item('b').getAttribute('data-state')).toBe('on');
    expect(item('a').getAttribute('aria-pressed')).toBe('false');
  });

  it('single: click selects an item and reflects the projection', async () => {
    const user = userEvent.setup();
    await mount();
    await user.click(item('a'));
    expect(item('a').getAttribute('aria-pressed')).toBe('true');
    expect(item('a').getAttribute('data-state')).toBe('on');
  });

  it('multiple: SSR seeds every value, clicks add to the set', async () => {
    const user = userEvent.setup();
    await mount({ type: 'multiple', value: ['a', 'c'] });
    expect(item('a').getAttribute('aria-pressed')).toBe('true');
    expect(item('c').getAttribute('aria-pressed')).toBe('true');
    await user.click(item('b'));
    expect(item('b').getAttribute('aria-pressed')).toBe('true');
  });

  it('arrow keys move focus ONLY -- they do not toggle', async () => {
    const user = userEvent.setup();
    await mount();
    item('a').focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(item('b'));
    expect(item('b').getAttribute('aria-pressed')).toBe('false');
  });

  it('Space toggles the focused item', async () => {
    const user = userEvent.setup();
    await mount();
    item('c').focus();
    await user.keyboard(' ');
    expect(item('c').getAttribute('aria-pressed')).toBe('true');
  });

  it('icons: the server markup already hides each wrapper, before any script runs', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(ToggleGroup, {
      props: { id: 'tg', items },
      slots: {
        'start-icon-a': '<svg><title>Mail</title></svg>',
        'end-icon-a': '<svg></svg>',
      },
    });
    document.body.innerHTML = html; // no bindToggleGroup: the SSR render alone
    const start = document.querySelector('[data-part="startIcon"]');
    const end = document.querySelector('[data-part="endIcon"]');
    expect(start?.getAttribute('aria-hidden')).toBe('true');
    expect(start?.getAttribute('data-icon')).toBe('inline-start');
    expect(end?.getAttribute('aria-hidden')).toBe('true');
    expect(end?.getAttribute('data-icon')).toBe('inline-end');
    const order = [...item('a').querySelectorAll('[data-part]')].map((el) =>
      el.getAttribute('data-part'),
    );
    expect(order).toEqual(['startIcon', 'endIcon']);
    expect(item('a').firstElementChild).toBe(start);
    expect(item('a').lastElementChild).toBe(end);
    expect(item('b').querySelector('[data-part="startIcon"]')).toBeNull();
  });

  it('icons: no wrapper when no icon slot is given', async () => {
    await mount();
    expect(document.querySelector('[data-part="startIcon"]')).toBeNull();
    expect(document.querySelector('[data-part="endIcon"]')).toBeNull();
  });
});
