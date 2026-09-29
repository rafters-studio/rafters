/**
 * React performance of the date-picker score, driven end to end: the trigger
 * opens the popup, the grid (calendar's React performance) selects, the glue
 * closes a complete selection and the value submits with its form. today and
 * the visible month are pinned so every projection is deterministic.
 */
import * as React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button } from '../../../src/components/button/button';
import { Calendar } from '../../../src/components/calendar/calendar';
import { DatePicker, type DatePickerProps } from '../../../src/components/date-picker/date-picker';
import {
  datePicker,
  type DatePickerConfig,
  type DatePickerPart,
  type DatePickerState,
} from '../../../src/components/date-picker/date-picker.behavior';
import { Popover, PopoverContent, PopoverTrigger } from '../../../src/components/popover/popover';

const TODAY = new Date(2026, 6, 20);
const MONTH = new Date(2026, 6, 1);
const calendarProps = { today: TODAY, defaultMonth: MONTH };

const body = () => document.body;
const part = (name: string): HTMLElement => {
  const el = body().querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!el) throw new Error(`no part ${name}`);
  return el;
};
const dayCell = (iso: string): HTMLElement => {
  const el = body().querySelector<HTMLElement>(`[data-part="day"][data-value="${iso}"]`);
  if (!el) throw new Error(`no day cell for ${iso}`);
  return el;
};

/** Rendered ARIA equals the score's projection for the picker's own parts --
 *  including absence: a projected `undefined` must not render. */
function assertContract(state: DatePickerState, config: DatePickerConfig): void {
  const rendered: DatePickerPart[] = ['trigger', 'content', 'value'];
  const ids = { trigger: '', content: '', value: '', anchor: '', close: '' };
  for (const name of rendered) ids[name] = part(name).id;
  const projection = datePicker.aria(state, config, ids);
  for (const name of rendered) {
    const element = part(name);
    const role = datePicker.parts[name].role;
    if (role) expect(element.getAttribute('role')).toBe(role);
    for (const [attr, value] of Object.entries(projection[name] ?? {})) {
      if (value === undefined) {
        expect(element.hasAttribute(attr), `${name} must NOT render ${attr}`).toBe(false);
      } else {
        expect(element.getAttribute(attr), `${name} ${attr}`).toBe(String(value));
      }
    }
  }
}

function renderPicker(props: Partial<DatePickerProps> = {}) {
  return render(<DatePicker calendarProps={calendarProps} {...(props as DatePickerProps)} />);
}

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

describe('date-picker [react]', () => {
  it('closed: trigger shows the placeholder, popup present but hidden, ARIA equals the projection', () => {
    renderPicker();
    expect(part('value').textContent).toBe('Pick a date');
    expect(part('content').hidden).toBe(true);
    const config: DatePickerConfig = { mode: 'single' };
    assertContract(datePicker.initialState(config), config);
  });

  it('opening moves focus to the grid tabstop and wires aria-controls', async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(part('trigger'));
    expect(part('content').hidden).toBe(false);
    expect(part('trigger').getAttribute('aria-controls')).toBe(part('content').id);
    expect(document.activeElement).toBe(dayCell('2026-07-20'));
    const config: DatePickerConfig = { mode: 'single' };
    assertContract({ ...datePicker.initialState(config), open: true }, config);
  });

  it('selecting a date sets the label, closes, returns focus and reports the Date', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const onOpenChange = vi.fn();
    renderPicker({ onValueChange, onOpenChange });
    await user.click(part('trigger'));
    await user.click(dayCell('2026-07-08'));
    expect(part('value').textContent).toBe('Jul 8, 2026');
    expect(part('value').hasAttribute('data-empty')).toBe(false);
    expect(part('content').hidden).toBe(true);
    expect(document.activeElement).toBe(part('trigger'));
    expect(onValueChange).toHaveBeenCalledWith(new Date(2026, 6, 8));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('keyboard: arrows move in the grid, Enter selects and closes', async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(part('trigger'));
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(dayCell('2026-07-21'));
    await user.keyboard('{Enter}');
    expect(part('value').textContent).toBe('Jul 21, 2026');
    expect(part('content').hidden).toBe(true);
  });

  it('Escape from a focused day cell closes without changing the value', async () => {
    const user = userEvent.setup();
    renderPicker({ defaultValue: new Date(2026, 6, 8) });
    await user.click(part('trigger'));
    expect(document.activeElement).toBe(dayCell('2026-07-08'));
    await user.keyboard('{Escape}');
    expect(part('content').hidden).toBe(true);
    expect(document.activeElement).toBe(part('trigger'));
    expect(part('value').textContent).toBe('Jul 8, 2026');
  });

  it('range: stays open after the start, closes on the end with the oracle label', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderPicker({ mode: 'range', onValueChange } as Partial<DatePickerProps>);
    await user.click(part('trigger'));
    await user.click(dayCell('2026-07-10'));
    expect(part('content').hidden).toBe(false);
    expect(part('value').textContent).toBe('Jul 10, 2026');
    await user.click(dayCell('2026-07-14'));
    expect(part('content').hidden).toBe(true);
    expect(part('value').textContent).toBe('Jul 10, 2026 - Jul 14, 2026');
    expect(onValueChange).toHaveBeenLastCalledWith({
      from: new Date(2026, 6, 10),
      to: new Date(2026, 6, 14),
    });
  });

  it('an outside pointerdown dismisses', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <button type="button">elsewhere</button>
        <DatePicker calendarProps={calendarProps} />
      </div>,
    );
    await user.click(part('trigger'));
    await user.click(body().querySelector('button:not([data-part])') as HTMLElement);
    expect(part('content').hidden).toBe(true);
  });

  it('submits with its form through the hidden input', async () => {
    const user = userEvent.setup();
    render(
      <form>
        <DatePicker name="due" calendarProps={calendarProps} />
      </form>,
    );
    const form = body().querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('due')).toBe('');
    await user.click(part('trigger'));
    await user.click(dayCell('2026-07-08'));
    expect(new FormData(form).get('due')).toBe('2026-07-08');
  });

  it('controlled value: the label follows the prop, and the callback reports the value to set', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderPicker({ value: new Date(2026, 6, 1), onValueChange });
    expect(part('value').textContent).toBe('Jul 1, 2026');
    await user.click(part('trigger'));
    await user.click(dayCell('2026-07-08'));
    expect(onValueChange).toHaveBeenCalledWith(new Date(2026, 6, 8));
    expect(part('value').textContent).toBe('Jul 1, 2026');
  });

  it('controlled reset to undefined clears the label, the grid and the form value', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [date, setDate] = React.useState<Date | undefined>();
      return (
        <form>
          <DatePicker
            name="due"
            value={date}
            onValueChange={setDate}
            calendarProps={calendarProps}
          />
          <button type="button" onClick={() => setDate(undefined)}>
            reset
          </button>
        </form>
      );
    }
    render(<Harness />);
    await user.click(part('trigger'));
    await user.click(dayCell('2026-07-08'));
    expect(part('value').textContent).toBe('Jul 8, 2026');
    await user.click(body().querySelector('button:not([data-part])') as HTMLElement);
    expect(part('value').textContent).toBe('Pick a date');
    const form = body().querySelector('form') as HTMLFormElement;
    expect(new FormData(form).get('due')).toBe('');
    expect(dayCell('2026-07-08').getAttribute('aria-selected')).toBe('false');
  });

  it('disabled: the trigger is inert and the popup never opens', async () => {
    const user = userEvent.setup();
    renderPicker({ disabled: true });
    expect((part('trigger') as HTMLButtonElement).disabled).toBe(true);
    await user.click(part('trigger'));
    expect(part('content').hidden).toBe(true);
  });

  it('formatDate overrides the label format (React-only)', async () => {
    renderPicker({
      defaultValue: new Date(2026, 6, 8),
      formatDate: (d) => d.toISOString().slice(0, 4),
    });
    expect(part('value').textContent).toBe('2026');
  });
});

/** shadcn ships date-picker as a composition, not a component: its docs page is
 *  this exact tree. It must drop in unchanged over rafters' Popover + Calendar. */
function ShadcnDatePicker() {
  const [date, setDate] = React.useState<Date | undefined>();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" data-empty={!date}>
          {date ? date.toDateString() : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" aria-label="Choose date">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          today={TODAY}
          defaultMonth={MONTH}
        />
      </PopoverContent>
    </Popover>
  );
}

describe('date-picker [shadcn composition parity]', () => {
  it('Popover + PopoverTrigger asChild Button + PopoverContent + Calendar selects a date', async () => {
    const user = userEvent.setup();
    render(<ShadcnDatePicker />);
    const trigger = body().querySelector<HTMLElement>('[data-part="trigger"]') as HTMLElement;
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.textContent).toBe('Pick a date');
    await user.click(trigger);
    const content = body().querySelector<HTMLElement>('[data-part="content"]') as HTMLElement;
    expect(content.getAttribute('role')).toBe('dialog');
    await user.click(dayCell('2026-07-08'));
    expect(trigger.textContent).toBe(new Date(2026, 6, 8).toDateString());
    expect(trigger.getAttribute('data-empty')).toBe('false');
  });
});
