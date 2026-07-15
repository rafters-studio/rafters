import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { AspectRatio } from '../../../src/old/ui/aspect-ratio';

describe('AspectRatio - Accessibility', () => {
  it('has no accessibility violations with image content', async () => {
    const { container } = render(
      <AspectRatio ratio={16 / 9}>
        <img src="/photo.jpg" alt="A descriptive alt text" className="object-cover" />
      </AspectRatio>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations with video content', async () => {
    const { container } = render(
      <AspectRatio ratio={16 / 9}>
        <video controls aria-label="Video player">
          <track kind="captions" />
        </video>
      </AspectRatio>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with square avatar container', async () => {
    const { container } = render(
      <AspectRatio ratio={1}>
        <img src="/avatar.jpg" alt="User avatar" className="object-cover rounded-full" />
      </AspectRatio>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when used in a figure', async () => {
    const { container } = render(
      <figure>
        <AspectRatio ratio={4 / 3}>
          <img src="/landscape.jpg" alt="A beautiful landscape" className="object-cover" />
        </AspectRatio>
        <figcaption>A beautiful landscape photograph</figcaption>
      </figure>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations when nested in a link', async () => {
    const { container } = render(
      <a href="/gallery/1">
        <AspectRatio ratio={16 / 9}>
          <img src="/thumbnail.jpg" alt="View gallery" className="object-cover" />
        </AspectRatio>
      </a>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
