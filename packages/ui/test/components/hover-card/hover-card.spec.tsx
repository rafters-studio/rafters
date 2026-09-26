/**
 * Spec for HoverCard, React target.
 *
 * WHAT CHANGED AT #2148: the preview is no longer mounted on the open axis and
 * no longer portals to document.body by default. `HoverCardRoot` renders a real
 * `<div data-part="root" data-hover-card>` and the trigger and content are DOM
 * SIBLINGS inside it, present at all times -- which is the CSS contract, since
 * the stylesheet reveals the preview through `[data-hover-card]:hover >
 * [data-part=content]` and a node that does not exist cannot be revealed.
 *
 * So the assertions here are about the score's ATTRIBUTES (data-state,
 * aria-describedby, data-dismissed), not about presence. Whether those
 * attributes make the preview visible -- and, uniquely among the three
 * hover-triggered components, hold it through a linger on the way out -- is the
 * stylesheet's half, pinned by hover-card.classes.test.ts and
 * test/motion/hover-reveal.spec.ts.
 *
 * Interaction is driven by dispatching the real native events the browser
 * itself would fire, not a synthetic-event library: `pointerover`/`pointerout`
 * (bubbling) are what React infers its non-bubbling `onPointerEnter`/
 * `onPointerLeave` from, and real `.focus()`/`.blur()` calls raise the matching
 * `focus`/`blur` pair natively. No real mouse ever moves here, so
 * `:hover`-based checks inside the component (the focus/hover dismissal
 * handoff) resolve exactly as they did under jsdom: never matching.
 */
import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardPortal,
  HoverCardTrigger,
} from '../../../src/components/hover-card/hover-card';
import {
  hoverCard,
  type HoverCardConfig,
  type HoverCardPart,
  type HoverCardState,
} from '../../../src/components/hover-card/hover-card.behavior';

interface SetupProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disableHoverableContent?: boolean;
}

function TestHoverCard(props: SetupProps) {
  return (
    <HoverCard {...props}>
      <HoverCardTrigger href="/user/john">@john</HoverCardTrigger>
      <HoverCardContent aria-label="John Doe">
        <span>Software Engineer</span>
      </HoverCardContent>
    </HoverCard>
  );
}

function part(root: ParentNode, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-part="${name}"]`);
}

function stateOf(root: ParentNode, name: 'trigger' | 'content'): string | null {
  return part(root, name)?.getAttribute('data-state') ?? null;
}

function rootEl(root: ParentNode): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-part="root"][data-hover-card]');
}

/** React infers its non-bubbling onPointerEnter/onPointerLeave from the
 *  bubbling pointerover/pointerout pair, comparing target and relatedTarget --
 *  dispatching pointerenter/pointerleave directly never reaches it. */
function enterScope(el: HTMLElement, relatedTarget: EventTarget | null = null): void {
  el.dispatchEvent(
    new PointerEvent('pointerover', { bubbles: true, cancelable: true, relatedTarget }),
  );
}
function leaveScope(el: HTMLElement, relatedTarget: EventTarget | null = null): void {
  el.dispatchEvent(
    new PointerEvent('pointerout', { bubbles: true, cancelable: true, relatedTarget }),
  );
}
function pressEscape(el: HTMLElement): void {
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
  );
}

/** Inlined equivalent of the former harness's assertContractFulfillment: every
 *  expected part is rendered (with its declared role, if any) and the DOM's
 *  ARIA equals the score's own projection, including absence. */
function assertContract(
  root: ParentNode,
  state: HoverCardState,
  config: HoverCardConfig,
  expectedParts: readonly HoverCardPart[],
): void {
  for (const p of expectedParts) {
    const el = part(root, p);
    expect(el, `declared part "${p}" must be rendered`).not.toBeNull();
    const decl = hoverCard.parts[p];
    if (decl.role) expect(el?.getAttribute('role'), `part "${p}" role`).toBe(decl.role);
  }
  const allParts = Object.keys(hoverCard.parts) as HoverCardPart[];
  const ids = {} as Record<HoverCardPart, string>;
  for (const p of allParts) ids[p] = part(root, p)?.id ?? '';
  const projection = hoverCard.aria(state, config, ids);
  for (const p of allParts) {
    const attrs = projection[p];
    if (!attrs || !expectedParts.includes(p)) continue;
    const el = part(root, p);
    expect(el, `part "${p}" carrying aria`).not.toBeNull();
    if (!el) continue;
    for (const [attr, value] of Object.entries(attrs)) {
      if (value === undefined) {
        expect(el.hasAttribute(attr), `part "${p}" must NOT render ${attr}`).toBe(false);
      } else {
        expect(el.getAttribute(attr), `part "${p}" ${attr}`).toBe(String(value));
      }
    }
  }
}

test('the root is a real element with trigger and content as DOM siblings', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  const root = rootEl(container);
  expect(root).not.toBeNull();
  const trigger = part(container, 'trigger') as HTMLElement;
  const content = part(container, 'content') as HTMLElement;
  expect(trigger.parentElement).toBe(root);
  expect(content.parentElement).toBe(root);
  expect(trigger.nextElementSibling).toBe(content);
});

test('closed: the preview is PRESENT, described, never hidden', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  const trigger = part(container, 'trigger') as HTMLElement;
  const content = part(container, 'content') as HTMLElement;
  expect(content).not.toBeNull();
  expect(trigger.getAttribute('aria-describedby')).toBe(content.id);
  expect(trigger.hasAttribute('aria-expanded')).toBe(false);
  expect(stateOf(container, 'trigger')).toBe('closed');
  expect(stateOf(container, 'content')).toBe('closed');
  expect(content.hasAttribute('hidden')).toBe(false);
});

test('hover opens: content is role=dialog and ARIA equals the projection', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  enterScope(part(container, 'trigger') as HTMLElement);

  // The open axis lives in a React state update React 18/19 flush
  // asynchronously for a raw dispatched event (unlike a callback fired
  // synchronously inside the handler), so DOM-attribute checks poll briefly.
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('open'));
  const config: HoverCardConfig = { defaultOpen: false };
  const state: HoverCardState = { open: true };
  assertContract(container, state, config, ['trigger', 'content']);
  expect(part(container, 'content')?.getAttribute('role')).toBe('dialog');
});

test('trigger and content are wired by real DOM ids', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  enterScope(part(container, 'trigger') as HTMLElement);
  const content = part(container, 'content') as HTMLElement;
  expect(part(container, 'trigger')?.getAttribute('aria-describedby')).toBe(content.id);
  expect(content.getAttribute('role')).toBe('dialog');
});

test('keyboard focus opens the card', async () => {
  const { container } = await render(
    <main>
      <button type="button">before</button>
      <TestHoverCard />
    </main>,
  );
  // The score reacts to the focus event itself, not to how focus arrived --
  // real synthetic Tab keydowns do not move focus in a real browser, so the
  // trigger is focused directly.
  const trigger = part(container, 'trigger') as HTMLElement;
  trigger.focus();
  expect(document.activeElement).toBe(trigger);
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('open'));
});

test('Escape dismisses: the score closes AND the root raises data-dismissed', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  const trigger = part(container, 'trigger') as HTMLElement;
  trigger.focus();
  enterScope(trigger);
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('open'));
  pressEscape(trigger);
  await vi.waitFor(() => {
    expect(stateOf(container, 'content')).toBe('closed');
    expect(rootEl(container)?.getAttribute('data-dismissed')).toBe('true');
  });
});

test('leaving the trigger closes the card and clears any dismissal', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  const trigger = part(container, 'trigger') as HTMLElement;
  enterScope(trigger);
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('open'));
  pressEscape(trigger);
  await vi.waitFor(() => expect(rootEl(container)?.getAttribute('data-dismissed')).toBe('true'));
  leaveScope(rootEl(container) as HTMLElement);
  await vi.waitFor(() => {
    expect(stateOf(container, 'content')).toBe('closed');
    // Nothing held the focus here, so the pointer was the LAST reveal
    // condition to go and the flag settles with it.
    expect(rootEl(container)?.hasAttribute('data-dismissed')).toBe(false);
  });
});

test('the dismissal survives a pointer leave while the trigger still holds focus', async () => {
  // The reveal rule has a focus half of its own
  // (`[data-hover-card]:has(> [data-part=trigger]:focus-visible)`), so a
  // pointerleave that cleared the flag put the dismissed card straight back up
  // -- visible against `data-state="closed"` (WCAG 1.4.13).
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  const trigger = part(container, 'trigger') as HTMLElement;
  trigger.focus();
  enterScope(trigger);
  pressEscape(trigger);
  await vi.waitFor(() => expect(rootEl(container)?.getAttribute('data-dismissed')).toBe('true'));

  leaveScope(rootEl(container) as HTMLElement);
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('closed'));
  expect(document.activeElement).toBe(trigger);
  expect(rootEl(container)?.getAttribute('data-dismissed')).toBe('true');
});

test('the dismissal settles once the trigger blurs too', async () => {
  // The handoff: whichever of pointer/focus leaves LAST does the clear, so a
  // flag never outlives every reveal condition and blocks the next hover.
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  const trigger = part(container, 'trigger') as HTMLElement;
  trigger.focus();
  enterScope(trigger);
  pressEscape(trigger);
  leaveScope(rootEl(container) as HTMLElement);
  await vi.waitFor(() => expect(rootEl(container)?.getAttribute('data-dismissed')).toBe('true'));

  trigger.blur();
  await vi.waitFor(() => expect(rootEl(container)?.hasAttribute('data-dismissed')).toBe(false));
});

test('hoverable content holds the card open: the root is the hover scope', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard />
    </main>,
  );
  const trigger = part(container, 'trigger') as HTMLElement;
  const content = part(container, 'content') as HTMLElement;
  enterScope(trigger);
  // Trigger -> content never leaves the root, so the score stays open with no
  // grace-window timer bridging the travel. The LINGER on the way back out is
  // the stylesheet's transition-delay, not a JavaScript window.
  enterScope(content, trigger);
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('open'));
  leaveScope(content);
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('closed'));
});

test('disableHoverableContent narrows the hover scope to the trigger', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard disableHoverableContent />
    </main>,
  );
  expect(rootEl(container)?.getAttribute('data-disable-hoverable-content')).toBe('true');
  const trigger = part(container, 'trigger') as HTMLElement;
  const content = part(container, 'content') as HTMLElement;
  enterScope(trigger);
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('open'));
  leaveScope(trigger);
  // Content hover does not hold it open: the trigger alone is the scope, in
  // JavaScript exactly as in the `:has()` reveal rule.
  enterScope(content);
  await vi.waitFor(() => expect(stateOf(container, 'content')).toBe('closed'));
});

test('uncontrolled callback fires once per real transition', async () => {
  const onOpenChange = vi.fn();
  const { container } = await render(
    <main>
      <TestHoverCard onOpenChange={onOpenChange} />
    </main>,
  );
  const trigger = part(container, 'trigger') as HTMLElement;
  enterScope(trigger);
  expect(onOpenChange).toHaveBeenCalledTimes(1);
  expect(onOpenChange).toHaveBeenLastCalledWith(true);
  leaveScope(trigger);
  expect(onOpenChange).toHaveBeenCalledTimes(2);
  expect(onOpenChange).toHaveBeenLastCalledWith(false);
});

test('controlled: data-state follows the prop, never the gesture', async () => {
  const onOpenChange = vi.fn();
  const { container, rerender } = await render(
    <main>
      <TestHoverCard open={false} onOpenChange={onOpenChange} />
    </main>,
  );
  enterScope(part(container, 'trigger') as HTMLElement);
  expect(onOpenChange).toHaveBeenLastCalledWith(true);
  expect(stateOf(container, 'content')).toBe('closed');

  await rerender(
    <main>
      <TestHoverCard open onOpenChange={onOpenChange} />
    </main>,
  );
  expect(stateOf(container, 'content')).toBe('open');
});

test('explicit Portal composition is the opt-OUT of the sibling contract', async () => {
  const target = document.createElement('div');
  target.id = 'card-portal';
  document.body.appendChild(target);
  const { container } = await render(
    <main>
      <HoverCard>
        <HoverCardTrigger href="/user/john">@john</HoverCardTrigger>
        <HoverCardPortal container={target}>
          <HoverCardContent aria-label="John Doe">
            <span>Software Engineer</span>
          </HoverCardContent>
        </HoverCardPortal>
      </HoverCard>
    </main>,
  );
  // Closed, the explicit portal renders nothing: a consumer who reaches for it
  // has taken that instance off the CSS reveal path deliberately.
  expect(target.querySelector('[data-part="content"]')).toBeNull();
  enterScope(part(container, 'trigger') as HTMLElement);
  await vi.waitFor(() => expect(target.querySelector('[data-part="content"]')).not.toBeNull());
  expect(document.querySelectorAll('[data-part="content"]')).toHaveLength(1);
  target.remove();
});

test('defaultOpen mounts the card already shown', async () => {
  const { container } = await render(
    <main>
      <TestHoverCard defaultOpen />
    </main>,
  );
  expect(stateOf(container, 'content')).toBe('open');
  expect(stateOf(container, 'trigger')).toBe('open');
});

test('Escape dismisses a defaultOpen card that never received a hover/focus event', async () => {
  // Regression: dismissal routed only through the retired hover primitive left
  // a defaultOpen card open, because no prior hover/focus had given it any
  // state to close.
  const { container } = await render(
    <main>
      <TestHoverCard defaultOpen />
    </main>,
  );
  expect(stateOf(container, 'content')).toBe('open');
  pressEscape(part(container, 'trigger') as HTMLElement);
  await vi.waitFor(() => {
    expect(stateOf(container, 'content')).toBe('closed');
    expect(rootEl(container)?.getAttribute('data-dismissed')).toBe('true');
  });
});
