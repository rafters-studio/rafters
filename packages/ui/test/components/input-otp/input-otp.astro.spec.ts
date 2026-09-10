/**
 * Astro performance of the input-otp score, driven end to end. AstroContainer
 * renders the SSR field with the projection and the painted slots already
 * applied, but does NOT run the <script>, so the test calls bindInputOtp
 * directly on the server-rendered root -- that IS the script's job -- then
 * drives the same score the React and WC performances drive.
 */
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InputOtp from '../../../src/components/input-otp/input-otp.astro';
import { bindInputOtp } from '../../../src/components/input-otp/input-otp.behavior';

afterEach(() => {
  document.body.innerHTML = '';
});

async function mount(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(InputOtp, {
    props: { id: 'otp', maxLength: 6, ...props },
  });
  document.body.innerHTML = `<div>${html}</div>`;
  const root = document.body.querySelector<HTMLElement>('[data-part="root"]')!;
  bindInputOtp(root);
  return root;
}

const input = () => document.body.querySelector<HTMLInputElement>('input[data-part="input"]')!;
const slots = () => Array.from(document.body.querySelectorAll<HTMLElement>('[data-part="slot"]'));

describe('input-otp conformance [astro]', () => {
  it('server-renders one slot per character, named and autofillable before any JS', async () => {
    await mount();
    expect(slots()).toHaveLength(6);
    expect(input().getAttribute('aria-label')).toBe('Enter 6 character code');
    expect(input().getAttribute('autocomplete')).toBe('one-time-code');
  });

  it('groups split declaratively, with a separator between them', async () => {
    const root = await mount({ groups: [3, 3] });
    expect(root.querySelectorAll('[data-part="group"]')).toHaveLength(2);
    expect(root.querySelectorAll('[data-part="separator"]')).toHaveLength(1);
    expect(root.querySelector('[data-part="separator"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(slots()).toHaveLength(6);
  });

  it('a seeded value is painted into the slots server-side', async () => {
    await mount({ defaultValue: '12-34' });
    expect(input().value).toBe('1234');
    expect(slots().map((slot) => slot.textContent)).toEqual(['1', '2', '3', '4', '', '']);
    expect(slots()[0]?.getAttribute('data-filled')).toBe('true');
    expect(slots()[4]?.getAttribute('data-active')).toBe('true');
  });

  it('typing fills slots through the setValue dispatch', async () => {
    const user = userEvent.setup();
    await mount();
    await user.type(input(), '123');
    expect(input().value).toBe('123');
    expect(slots()[2]?.textContent).toBe('3');
    expect(slots()[3]?.getAttribute('data-active')).toBe('true');
  });

  it('the pattern prop crosses to the client through data-pattern', async () => {
    const user = userEvent.setup();
    await mount({ pattern: '^[a-z]$' });
    await user.type(input(), 'a1b');
    expect(input().value).toBe('ab');
  });

  it('paste splits a whole code and fires the completion event', async () => {
    const user = userEvent.setup();
    const root = await mount();
    const onComplete = vi.fn();
    root.addEventListener('rafters-otp-complete', onComplete);
    input().focus();
    await user.paste('123456');
    expect(input().value).toBe('123456');
    expect(root.getAttribute('data-complete')).toBe('true');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('arrows move the lit slot without moving focus', async () => {
    const user = userEvent.setup();
    await mount({ defaultValue: '123' });
    input().focus();
    await user.keyboard('{ArrowLeft}');
    expect(slots()[2]?.getAttribute('data-active')).toBe('true');
    expect(document.activeElement).toBe(input());
  });

  it('disabled gates entry and projects the state', async () => {
    const user = userEvent.setup();
    const root = await mount({ disabled: true, defaultValue: '12' });
    expect(root.getAttribute('data-disabled')).toBe('true');
    await user.type(input(), '3');
    expect(input().value).toBe('12');
  });

  it('required and name make it a real form field, no hidden mirror', async () => {
    const root = await mount({ required: true, name: 'code' });
    expect(input().getAttribute('aria-required')).toBe('true');
    expect(input().name).toBe('code');
    expect(root.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
  });
});
