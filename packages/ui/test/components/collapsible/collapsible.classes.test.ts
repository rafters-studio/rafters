import { describe, expect, it } from 'vitest';
import { collapsible } from '../../../src/components/collapsible/collapsible.behavior';
import { collapsibleClasses } from '../../../src/components/collapsible/collapsible.classes';

const config = {};
const classes = collapsibleClasses(config, collapsible.initialState(config));

describe('collapsible classes', () => {
  it('the trigger has hover feedback and a token focus ring', () => {
    expect(classes.trigger).toContain('hover:bg-muted');
    expect(classes.trigger).toContain('focus-visible:ring-ring');
    expect(classes.trigger).toContain('ring-offset-background');
  });

  it('the trigger dims and blocks interaction while disabled', () => {
    expect(classes.trigger).toContain('disabled:opacity-50');
    expect(classes.trigger).toContain('disabled:cursor-not-allowed');
    expect(classes.trigger).toContain('disabled:pointer-events-none');
  });

  it('the trigger hover carries its row: color, fast, standard', () => {
    // motion.jsonl collapsible / trigger / "hover".
    expect(classes.trigger).toContain('transition-colors');
    expect(classes.trigger).toContain('duration-fast');
    expect(classes.trigger).toContain('ease-standard');
  });

  it('the content reveals by transitioning grid-template-rows, never height', () => {
    // Reveal is a TRANSITION: height:auto is not transitionable, so the row
    // animates 0fr<->1fr on an element that stays present. No animate-* cell
    // exists for either direction.
    expect(classes.content).toContain('transition-[grid-template-rows,opacity]');
    expect(classes.content).toContain('grid-rows-[minmax(0,0fr)]');
    expect(classes.content).toContain('group-data-[state=open]:grid-rows-[minmax(0,1fr)]');
    expect(classes.content).not.toContain('animate-');
    expect(classes.content).not.toContain('transition-all');
  });

  it('each direction carries its own row: open normal/enter, closed moderate/exit', () => {
    expect(classes.content).toContain('group-data-[state=open]:duration-normal');
    expect(classes.content).toContain('group-data-[state=open]:ease-enter');
    expect(classes.content).toContain('duration-moderate');
    expect(classes.content).toContain('ease-exit');
  });

  it('the reveal reads state from the root group, the only node given data-state', () => {
    // collapsible.behavior.ts projects data-state onto `root` alone -- the
    // content gets only data-disabled -- so a content-scoped data-[state=open]
    // variant would match nothing while reading as consumed.
    expect(classes.root.split(/\s+/)).toContain('group');
    for (const candidate of classes.content.split(/\s+/))
      expect(candidate.startsWith('data-[state=')).toBe(false);
  });

  it('the child clips so the 0fr track can actually collapse', () => {
    // Stands in for the inner box accordion has as contentInner and this class
    // set has no part for.
    expect(classes.content).toContain('[&>*]:min-h-0');
    expect(classes.content).toContain('[&>*]:overflow-hidden');
  });

  it('states no timing as a literal and queries reduced motion nowhere', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\b(duration|delay)-\d/);
      expect(value).not.toContain('motion-reduce');
    }
  });

  it('carries no raw color, spacing or z-index utilities', () => {
    for (const value of Object.values(classes)) {
      expect(value).not.toMatch(/\bz-\d/);
      expect(value).not.toMatch(/\bbg-\[/);
      expect(value).not.toMatch(/\btext-\[/);
    }
  });
});
