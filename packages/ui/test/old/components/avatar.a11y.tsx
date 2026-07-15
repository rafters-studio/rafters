import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Avatar, AvatarFallback, AvatarImage } from '../../../src/old/ui/avatar';

describe('Avatar - Accessibility', () => {
  it('has no accessibility violations with fallback only', async () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with image and alt text', async () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="Jane Doe" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with all sizes', async () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
    for (const size of sizes) {
      const { container } = render(
        <Avatar size={size}>
          <AvatarFallback>AB</AvatarFallback>
        </Avatar>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    }
  });

  it('has no violations when marked as decorative', async () => {
    const { container } = render(
      <Avatar aria-hidden="true">
        <AvatarImage src="https://example.com/bot.png" alt="" />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with icon fallback', async () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>
          <svg
            aria-hidden="true"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-8 8-8s8 4 8 8" />
          </svg>
        </AvatarFallback>
      </Avatar>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom aria attributes', async () => {
    const { container } = render(
      <Avatar aria-label="User avatar for John Smith" role="img">
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations in a list context', async () => {
    const { container } = render(
      <ul>
        <li>
          <Avatar>
            <AvatarImage src="https://example.com/user1.jpg" alt="User 1" />
            <AvatarFallback>U1</AvatarFallback>
          </Avatar>
          <span>User 1</span>
        </li>
        <li>
          <Avatar>
            <AvatarImage src="https://example.com/user2.jpg" alt="User 2" />
            <AvatarFallback>U2</AvatarFallback>
          </Avatar>
          <span>User 2</span>
        </li>
      </ul>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with empty alt for decorative image', async () => {
    const { container } = render(
      <div>
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <span>Jane Doe</span>
      </div>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('AvatarImage - Accessibility', () => {
  it('has no violations when used correctly', async () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/profile.jpg" alt="Profile picture" />
        <AvatarFallback>PF</AvatarFallback>
      </Avatar>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('AvatarFallback - Accessibility', () => {
  it('has no violations as standalone within Avatar', async () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no violations with custom aria attributes', async () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback aria-label="Initials AB">AB</AvatarFallback>
      </Avatar>,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
