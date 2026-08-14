import { describe, expect, it } from 'vitest';
import {
  embedContainerClasses,
  embedFallbackClasses,
  embedFallbackLinkClasses,
  embedFallbackMessageClasses,
  embedIframeClasses,
} from '../../../src/components/embed/embed.classes';

describe('embed classes', () => {
  it('the container is a rounded, clipped, muted surface (no raw values)', () => {
    expect(embedContainerClasses).toBe('relative overflow-hidden rounded-lg bg-muted');
  });

  it('the iframe fills the aspect-ratio container', () => {
    expect(embedIframeClasses).toBe('absolute inset-0 h-full w-full border-0');
  });

  it('the fallback is a dashed, centered recovery panel', () => {
    expect(embedFallbackClasses).toBe(
      'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 p-8 text-center',
    );
  });

  it('the fallback message uses the semantic label typography token', () => {
    expect(embedFallbackMessageClasses).toBe(
      'mb-2 text-label-small ts-label-small font-medium text-muted-foreground',
    );
  });

  it('the fallback link uses the primary role token', () => {
    expect(embedFallbackLinkClasses).toBe(
      'text-label-small ts-label-small text-primary underline underline-offset-4 hover:text-primary/80',
    );
  });

  it('never emits a raw arbitrary value', () => {
    for (const cls of [
      embedContainerClasses,
      embedIframeClasses,
      embedFallbackClasses,
      embedFallbackMessageClasses,
      embedFallbackLinkClasses,
    ]) {
      expect(cls).not.toMatch(/\[[a-z0-9.#/]+\]/);
    }
  });
});
