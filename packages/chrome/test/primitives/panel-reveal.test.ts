import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPanelReveal, resetPanelRevealState } from '../../src/primitives/panel-reveal';

describe('createPanelReveal', () => {
  let trigger: HTMLButtonElement;
  let panel: HTMLDivElement;

  beforeEach(() => {
    resetPanelRevealState();

    trigger = document.createElement('button');
    trigger.textContent = 'Layers';
    document.body.appendChild(trigger);

    panel = document.createElement('div');
    document.body.appendChild(panel);
  });

  afterEach(() => {
    trigger.remove();
    panel.remove();
    resetPanelRevealState();
  });

  // ===========================================================================
  // Initialization
  // ===========================================================================

  describe('initialization', () => {
    it('sets data-state="closed" on panel', () => {
      const controls = createPanelReveal({ trigger, panel });

      expect(panel.getAttribute('data-state')).toBe('closed');

      controls.destroy();
    });

    it('sets aria-expanded="false" on trigger', () => {
      const controls = createPanelReveal({ trigger, panel });

      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      controls.destroy();
    });

    it('sets aria-controls on trigger linking to panel', () => {
      const controls = createPanelReveal({ trigger, panel });

      const panelId = panel.getAttribute('id');
      expect(panelId).toBeTruthy();
      expect(trigger.getAttribute('aria-controls')).toBe(panelId);

      controls.destroy();
    });

    it('sets role="region" on panel', () => {
      const controls = createPanelReveal({ trigger, panel });

      expect(panel.getAttribute('role')).toBe('region');

      controls.destroy();
    });

    it('sets aria-label on panel from trigger text content', () => {
      const controls = createPanelReveal({ trigger, panel });

      expect(panel.getAttribute('aria-label')).toBe('Layers');

      controls.destroy();
    });

    it('prefers trigger aria-label over text content', () => {
      trigger.setAttribute('aria-label', 'Layer Panel');
      const controls = createPanelReveal({ trigger, panel });

      expect(panel.getAttribute('aria-label')).toBe('Layer Panel');

      controls.destroy();
    });

    it('preserves existing panel id', () => {
      panel.setAttribute('id', 'my-panel');
      const controls = createPanelReveal({ trigger, panel });

      expect(panel.getAttribute('id')).toBe('my-panel');
      expect(trigger.getAttribute('aria-controls')).toBe('my-panel');

      controls.destroy();
    });

    it('sets --panel-depth CSS custom property on panel', () => {
      const controls = createPanelReveal({ trigger, panel });

      expect(panel.style.getPropertyValue('--panel-depth')).toBe('1');

      controls.destroy();
    });
  });

  // ===========================================================================
  // Open / Close State Transitions
  // ===========================================================================

  describe('open/close state transitions', () => {
    it('opens on trigger click', () => {
      const controls = createPanelReveal({ trigger, panel });

      trigger.click();

      expect(controls.isOpen()).toBe(true);
      expect(panel.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      controls.destroy();
    });

    it('closes on second trigger click', () => {
      const controls = createPanelReveal({ trigger, panel });

      trigger.click();
      trigger.click();

      expect(controls.isOpen()).toBe(false);
      expect(panel.getAttribute('data-state')).toBe('closed');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      controls.destroy();
    });

    it('calls onOpen when panel opens', () => {
      const onOpen = vi.fn();
      const controls = createPanelReveal({ trigger, panel, onOpen });

      controls.open();

      expect(onOpen).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('calls onClose when panel closes', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({ trigger, panel, onClose });

      controls.open();
      controls.close();

      expect(onClose).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('open() is idempotent when already open', () => {
      const onOpen = vi.fn();
      const controls = createPanelReveal({ trigger, panel, onOpen });

      controls.open();
      controls.open();

      expect(onOpen).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('close() is idempotent when already closed', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({ trigger, panel, onClose });

      controls.close();

      expect(onClose).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('toggle() opens when closed and closes when open', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.toggle();
      expect(controls.isOpen()).toBe(true);

      controls.toggle();
      expect(controls.isOpen()).toBe(false);

      controls.destroy();
    });
  });

  // ===========================================================================
  // Escape Key Dismissal
  // ===========================================================================

  describe('Escape key dismissal', () => {
    it('closes panel on Escape key', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(controls.isOpen()).toBe(false);
      expect(panel.getAttribute('data-state')).toBe('closed');

      controls.destroy();
    });

    it('returns focus to trigger after Escape', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(document.activeElement).toBe(trigger);

      controls.destroy();
    });

    it('does not close on non-Escape keys', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

      expect(controls.isOpen()).toBe(true);

      controls.destroy();
    });

    it('does nothing when panel is already closed', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({ trigger, panel, onClose });

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      expect(onClose).not.toHaveBeenCalled();

      controls.destroy();
    });
  });

  // ===========================================================================
  // Outside Click Dismissal
  // ===========================================================================

  describe('outside click dismissal', () => {
    it('closes panel on click outside trigger and panel', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      const outside = document.createElement('div');
      document.body.appendChild(outside);

      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(controls.isOpen()).toBe(false);

      outside.remove();
      controls.destroy();
    });

    it('does not close when clicking trigger', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      // Simulate mousedown on trigger (capture phase handler checks contains)
      const event = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(event, 'target', { value: trigger });
      document.dispatchEvent(event);

      // The click handler on trigger will toggle, but the outside click
      // handler should not fire since the target is the trigger.
      // We test that the outside click check doesn't close it.
      // Note: in this test the mousedown target is the trigger itself.
      expect(controls.isOpen()).toBe(true);

      controls.destroy();
    });

    it('does not close when clicking inside panel', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      const child = document.createElement('span');
      panel.appendChild(child);

      const event = new MouseEvent('mousedown', { bubbles: true });
      Object.defineProperty(event, 'target', { value: child });
      document.dispatchEvent(event);

      expect(controls.isOpen()).toBe(true);

      child.remove();
      controls.destroy();
    });

    it('does nothing when panel is closed', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({ trigger, panel, onClose });

      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(onClose).not.toHaveBeenCalled();

      controls.destroy();
    });
  });

  // ===========================================================================
  // Hover Continuation
  // ===========================================================================

  describe('hover continuation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('starts close delay when mouse leaves trigger', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 300,
        onClose,
      });

      controls.open();

      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      trigger.dispatchEvent(new MouseEvent('mouseleave'));

      // Not closed yet
      expect(onClose).not.toHaveBeenCalled();

      // Close after delay
      vi.advanceTimersByTime(300);

      expect(onClose).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('cancels close when re-entering trigger before delay expires', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 300,
        onClose,
      });

      controls.open();

      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      trigger.dispatchEvent(new MouseEvent('mouseleave'));

      vi.advanceTimersByTime(100);

      // Re-enter trigger
      trigger.dispatchEvent(new MouseEvent('mouseenter'));

      // Wait past original delay
      vi.advanceTimersByTime(300);

      expect(onClose).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('keeps panel open when moving from trigger to panel', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 300,
        onClose,
      });

      controls.open();

      // Mouse enters trigger, then leaves trigger and enters panel
      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      trigger.dispatchEvent(new MouseEvent('mouseleave'));

      // Enter panel before close delay fires
      panel.dispatchEvent(new MouseEvent('mouseenter'));

      // Wait well past the delay
      vi.advanceTimersByTime(600);

      expect(onClose).not.toHaveBeenCalled();
      expect(controls.isOpen()).toBe(true);

      controls.destroy();
    });

    it('starts close delay when mouse leaves panel', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 300,
        onClose,
      });

      controls.open();

      panel.dispatchEvent(new MouseEvent('mouseenter'));
      panel.dispatchEvent(new MouseEvent('mouseleave'));

      vi.advanceTimersByTime(300);

      expect(onClose).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('cancels close when re-entering panel before delay expires', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 300,
        onClose,
      });

      controls.open();

      panel.dispatchEvent(new MouseEvent('mouseenter'));
      panel.dispatchEvent(new MouseEvent('mouseleave'));

      vi.advanceTimersByTime(100);

      panel.dispatchEvent(new MouseEvent('mouseenter'));

      vi.advanceTimersByTime(300);

      expect(onClose).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('keeps panel open when moving from panel to trigger', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 300,
        onClose,
      });

      controls.open();

      panel.dispatchEvent(new MouseEvent('mouseenter'));
      panel.dispatchEvent(new MouseEvent('mouseleave'));

      // Enter trigger before delay fires
      trigger.dispatchEvent(new MouseEvent('mouseenter'));

      vi.advanceTimersByTime(600);

      expect(onClose).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('uses custom close delay', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 500,
        onClose,
      });

      controls.open();

      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      trigger.dispatchEvent(new MouseEvent('mouseleave'));

      // Default 300ms would have fired by now
      vi.advanceTimersByTime(300);
      expect(onClose).not.toHaveBeenCalled();

      // Custom 500ms
      vi.advanceTimersByTime(200);
      expect(onClose).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('closes immediately when closeDelay is 0', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 0,
        onClose,
      });

      controls.open();

      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      trigger.dispatchEvent(new MouseEvent('mouseleave'));

      expect(onClose).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('does not start close timer if panel is already closed', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 300,
        onClose,
      });

      // Panel is closed, mouse leave should not schedule close
      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      trigger.dispatchEvent(new MouseEvent('mouseleave'));

      vi.advanceTimersByTime(300);

      expect(onClose).not.toHaveBeenCalled();

      controls.destroy();
    });
  });

  // ===========================================================================
  // Disabled State
  // ===========================================================================

  describe('disabled state', () => {
    it('open is a no-op when disabled', () => {
      const onOpen = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        disabled: true,
        onOpen,
      });

      controls.open();

      expect(controls.isOpen()).toBe(false);
      expect(onOpen).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('close is a no-op when disabled', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        onClose,
      });

      controls.open();
      controls.setDisabled(true);

      // setDisabled(true) closes the panel if open, but after that:
      // Manually re-test that close is no-op
      onClose.mockClear();

      controls.close();
      expect(onClose).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('toggle is a no-op when disabled', () => {
      const controls = createPanelReveal({
        trigger,
        panel,
        disabled: true,
      });

      controls.toggle();

      expect(controls.isOpen()).toBe(false);

      controls.destroy();
    });

    it('trigger click is a no-op when disabled', () => {
      const onOpen = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        disabled: true,
        onOpen,
      });

      trigger.click();

      expect(controls.isOpen()).toBe(false);
      expect(onOpen).not.toHaveBeenCalled();

      controls.destroy();
    });

    it('setDisabled closes an open panel', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        onClose,
      });

      controls.open();
      expect(controls.isOpen()).toBe(true);

      controls.setDisabled(true);

      expect(controls.isOpen()).toBe(false);
      expect(onClose).toHaveBeenCalledTimes(1);

      controls.destroy();
    });

    it('setDisabled(false) re-enables operations', () => {
      const controls = createPanelReveal({
        trigger,
        panel,
        disabled: true,
      });

      controls.setDisabled(false);
      controls.open();

      expect(controls.isOpen()).toBe(true);

      controls.destroy();
    });
  });

  // ===========================================================================
  // Focus Trap
  // ===========================================================================

  describe('focus trap', () => {
    it('traps Tab within panel when trapFocus is true', () => {
      const btn1 = document.createElement('button');
      btn1.textContent = 'First';
      const btn2 = document.createElement('button');
      btn2.textContent = 'Second';
      panel.appendChild(btn1);
      panel.appendChild(btn2);

      const controls = createPanelReveal({
        trigger,
        panel,
        trapFocus: true,
      });

      controls.open();

      // Focus last element
      btn2.focus();
      expect(document.activeElement).toBe(btn2);

      // Tab from last should wrap to first
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
      });
      panel.dispatchEvent(tabEvent);

      expect(document.activeElement).toBe(btn1);

      controls.destroy();
      btn1.remove();
      btn2.remove();
    });

    it('traps Shift+Tab within panel', () => {
      const btn1 = document.createElement('button');
      btn1.textContent = 'First';
      const btn2 = document.createElement('button');
      btn2.textContent = 'Second';
      panel.appendChild(btn1);
      panel.appendChild(btn2);

      const controls = createPanelReveal({
        trigger,
        panel,
        trapFocus: true,
      });

      controls.open();

      // Focus first element
      btn1.focus();
      expect(document.activeElement).toBe(btn1);

      // Shift+Tab from first should wrap to last
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      });
      panel.dispatchEvent(shiftTabEvent);

      expect(document.activeElement).toBe(btn2);

      controls.destroy();
      btn1.remove();
      btn2.remove();
    });

    it('does not trap focus when trapFocus is false (default)', () => {
      const btn1 = document.createElement('button');
      btn1.textContent = 'First';
      panel.appendChild(btn1);

      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      btn1.focus();

      // Tab should not be intercepted
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      panel.dispatchEvent(tabEvent);

      // defaultPrevented should be false (not intercepted)
      expect(tabEvent.defaultPrevented).toBe(false);

      controls.destroy();
      btn1.remove();
    });

    it('removes focus trap on close', () => {
      const btn1 = document.createElement('button');
      btn1.textContent = 'First';
      const btn2 = document.createElement('button');
      btn2.textContent = 'Second';
      panel.appendChild(btn1);
      panel.appendChild(btn2);

      const controls = createPanelReveal({
        trigger,
        panel,
        trapFocus: true,
      });

      controls.open();
      controls.close();

      // Focus trap should be removed
      btn2.focus();

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      panel.dispatchEvent(tabEvent);

      // Tab should not be intercepted after close
      expect(tabEvent.defaultPrevented).toBe(false);

      controls.destroy();
      btn1.remove();
      btn2.remove();
    });
  });

  // ===========================================================================
  // Screen Reader Announcements
  // ===========================================================================

  describe('screen reader announcements', () => {
    it('creates a live region announcer', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      const announcer = document.querySelector('[data-panel-reveal-announcer]');
      expect(announcer).toBeTruthy();
      expect(announcer?.getAttribute('aria-live')).toBe('polite');
      expect(announcer?.getAttribute('role')).toBe('status');

      controls.destroy();
    });

    it('announcer is visually hidden', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      const announcer = document.querySelector('[data-panel-reveal-announcer]') as HTMLElement;
      expect(announcer).toBeTruthy();
      expect(announcer.style.position).toBe('absolute');
      expect(announcer.style.width).toBe('1px');
      expect(announcer.style.height).toBe('1px');

      controls.destroy();
    });
  });

  // ===========================================================================
  // Depth Management
  // ===========================================================================

  describe('depth management', () => {
    it('sets --panel-depth on panel element', () => {
      const controls = createPanelReveal({ trigger, panel });

      expect(panel.style.getPropertyValue('--panel-depth')).toBe('1');

      controls.destroy();
    });

    it('removes --panel-depth on destroy', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.destroy();

      expect(panel.style.getPropertyValue('--panel-depth')).toBe('');
    });
  });

  // ===========================================================================
  // Cleanup / Destroy
  // ===========================================================================

  describe('destroy', () => {
    it('removes event listeners from trigger', () => {
      const onOpen = vi.fn();
      const controls = createPanelReveal({ trigger, panel, onOpen });

      controls.destroy();

      trigger.click();

      expect(onOpen).not.toHaveBeenCalled();
    });

    it('removes event listeners from document', () => {
      const onClose = vi.fn();
      const controls = createPanelReveal({ trigger, panel, onClose });

      controls.open();
      controls.destroy();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

      // onClose was called once by destroy (if panel was open), but not by Escape
      // Actually, destroy doesn't close the panel -- it just removes listeners
      // The panel state becomes stale after destroy, which is fine
      // Let's verify no extra close call from Escape
      expect(onClose).not.toHaveBeenCalled();
    });

    it('removes ARIA attributes from trigger', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.destroy();

      expect(trigger.hasAttribute('aria-expanded')).toBe(false);
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });

    it('removes attributes from panel', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.destroy();

      expect(panel.hasAttribute('role')).toBe(false);
      expect(panel.hasAttribute('aria-label')).toBe(false);
      expect(panel.hasAttribute('data-state')).toBe(false);
    });

    it('clears pending close timer', () => {
      vi.useFakeTimers();

      const onClose = vi.fn();
      const controls = createPanelReveal({
        trigger,
        panel,
        closeDelay: 300,
        onClose,
      });

      controls.open();

      trigger.dispatchEvent(new MouseEvent('mouseenter'));
      trigger.dispatchEvent(new MouseEvent('mouseleave'));

      // Close is scheduled
      controls.destroy();

      // Advance past delay
      vi.advanceTimersByTime(300);

      // onClose should not have been called by the timer
      expect(onClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // SSR Guard
  // ===========================================================================

  describe('SSR', () => {
    it('returns no-op controls in SSR environment', () => {
      const originalWindow = globalThis.window;
      // @ts-expect-error Testing SSR
      delete globalThis.window;

      const controls = createPanelReveal({ trigger, panel });

      expect(() => controls.open()).not.toThrow();
      expect(() => controls.close()).not.toThrow();
      expect(() => controls.toggle()).not.toThrow();
      expect(controls.isOpen()).toBe(false);
      expect(() => controls.setDisabled(true)).not.toThrow();
      expect(() => controls.destroy()).not.toThrow();

      globalThis.window = originalWindow;
    });
  });

  // ===========================================================================
  // Focus Return
  // ===========================================================================

  describe('focus return', () => {
    it('returns focus to trigger on close', () => {
      const btn = document.createElement('button');
      btn.textContent = 'Inside Panel';
      panel.appendChild(btn);

      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      // Focus inside panel
      btn.focus();
      expect(document.activeElement).toBe(btn);

      controls.close();

      expect(document.activeElement).toBe(trigger);

      controls.destroy();
      btn.remove();
    });

    it('returns focus to trigger on outside click close', () => {
      const controls = createPanelReveal({ trigger, panel });

      controls.open();

      // Click outside
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

      expect(document.activeElement).toBe(trigger);

      controls.destroy();
    });
  });
});
