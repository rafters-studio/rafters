import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRuleDialog, type RuleDialogControls } from '../../src/primitives/rule-dialog';

// =============================================================================
// Helpers
// =============================================================================

function createAnchor(): HTMLDivElement {
  const el = document.createElement('div');
  // jsdom doesn't lay out so we stub getBoundingClientRect
  el.getBoundingClientRect = () => ({
    top: 100,
    bottom: 140,
    left: 50,
    right: 250,
    width: 200,
    height: 40,
    x: 50,
    y: 100,
    toJSON: () => ({}),
  });
  document.body.appendChild(el);
  return el;
}

function createDialog(): HTMLDivElement {
  const el = document.createElement('div');
  // Add a focusable element inside
  const btn = document.createElement('button');
  btn.textContent = 'Confirm';
  el.appendChild(btn);
  el.getBoundingClientRect = () => ({
    top: 0,
    bottom: 200,
    left: 0,
    right: 300,
    width: 300,
    height: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  document.body.appendChild(el);
  return el;
}

// =============================================================================
// Tests
// =============================================================================

describe('createRuleDialog', () => {
  let anchor: HTMLDivElement;
  let dialog: HTMLDivElement;
  let controls: RuleDialogControls;

  beforeEach(() => {
    anchor = createAnchor();
    dialog = createDialog();
  });

  afterEach(() => {
    controls?.destroy();
    anchor.remove();
    dialog.remove();
  });

  // ---------------------------------------------------------------------------
  // ARIA
  // ---------------------------------------------------------------------------

  it('sets role="dialog" and aria-modal on the dialog', () => {
    const onDismiss = vi.fn();
    controls = createRuleDialog({ anchor, dialog, onDismiss });
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('removes ARIA attributes on destroy', () => {
    const onDismiss = vi.fn();
    controls = createRuleDialog({ anchor, dialog, onDismiss });
    controls.destroy();
    expect(dialog.hasAttribute('role')).toBe(false);
    expect(dialog.hasAttribute('aria-modal')).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Positioning
  // ---------------------------------------------------------------------------

  it('positions dialog with fixed positioning', () => {
    const onDismiss = vi.fn();
    controls = createRuleDialog({ anchor, dialog, onDismiss });
    expect(dialog.style.position).toBe('fixed');
    expect(dialog.style.top).toBeTruthy();
    expect(dialog.style.left).toBeTruthy();
  });

  it('reposition recalculates position', () => {
    const onDismiss = vi.fn();
    controls = createRuleDialog({ anchor, dialog, onDismiss });
    const initialTop = dialog.style.top;
    // Move anchor
    anchor.getBoundingClientRect = () => ({
      top: 200,
      bottom: 240,
      left: 50,
      right: 250,
      width: 200,
      height: 40,
      x: 50,
      y: 200,
      toJSON: () => ({}),
    });
    controls.reposition();
    // Position should have changed (or stayed same if both resolve to same clamped value)
    expect(dialog.style.position).toBe('fixed');
    // The top value should reflect the new anchor position
    expect(dialog.style.top).not.toBe(initialTop);
  });

  // ---------------------------------------------------------------------------
  // Escape key
  // ---------------------------------------------------------------------------

  it('calls onDismiss when Escape is pressed', () => {
    const onDismiss = vi.fn();
    controls = createRuleDialog({ anchor, dialog, onDismiss });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss for non-Escape keys', () => {
    const onDismiss = vi.fn();
    controls = createRuleDialog({ anchor, dialog, onDismiss });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // Focus trap
  // ---------------------------------------------------------------------------

  it('focuses first focusable element inside dialog', () => {
    const onDismiss = vi.fn();
    controls = createRuleDialog({ anchor, dialog, onDismiss });
    const btn = dialog.querySelector('button');
    expect(document.activeElement).toBe(btn);
  });

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  it('Escape does not fire after destroy', () => {
    const onDismiss = vi.fn();
    controls = createRuleDialog({ anchor, dialog, onDismiss });
    controls.destroy();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // SSR guard
  // ---------------------------------------------------------------------------

  it('returns no-op controls when window is undefined', () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error Testing SSR environment
    delete globalThis.window;

    const ssrControls = createRuleDialog({
      anchor: null as unknown as HTMLElement,
      dialog: null as unknown as HTMLElement,
      onDismiss: () => {},
    });

    ssrControls.reposition();
    ssrControls.destroy();

    globalThis.window = originalWindow;
  });
});
