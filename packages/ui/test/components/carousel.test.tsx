import { fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import {
  Carousel,
  CarouselContent,
  CarouselIndicators,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from '../../src/components/ui/carousel';

const TestCarousel = ({ loop = false }: { loop?: boolean }) => (
  <Carousel loop={loop} data-testid="carousel">
    <CarouselContent data-testid="content">
      <CarouselItem data-testid="item-1">Slide 1</CarouselItem>
      <CarouselItem data-testid="item-2">Slide 2</CarouselItem>
      <CarouselItem data-testid="item-3">Slide 3</CarouselItem>
    </CarouselContent>
    <CarouselPrevious data-testid="previous" />
    <CarouselNext data-testid="next" />
  </Carousel>
);

describe('Carousel - Basic Rendering', () => {
  it('should render carousel with content and items', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('carousel')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toHaveTextContent('Slide 1');
    expect(screen.getByTestId('item-2')).toHaveTextContent('Slide 2');
    expect(screen.getByTestId('item-3')).toHaveTextContent('Slide 3');
  });

  it('should render navigation buttons', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('previous')).toBeInTheDocument();
    expect(screen.getByTestId('next')).toBeInTheDocument();
  });

  it('should render with namespaced components', () => {
    render(
      <Carousel data-testid="carousel">
        <Carousel.Content data-testid="content">
          <Carousel.Item data-testid="item">Slide 1</Carousel.Item>
        </Carousel.Content>
        <Carousel.Previous data-testid="prev" />
        <Carousel.Next data-testid="next" />
        <Carousel.Indicators data-testid="indicators" />
      </Carousel>,
    );

    expect(screen.getByTestId('carousel')).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('item')).toBeInTheDocument();
    expect(screen.getByTestId('prev')).toBeInTheDocument();
    expect(screen.getByTestId('next')).toBeInTheDocument();
    expect(screen.getByTestId('indicators')).toBeInTheDocument();
  });
});

describe('Carousel - ARIA Attributes', () => {
  it('should have region role on carousel', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('carousel')).toHaveAttribute('role', 'region');
  });

  it('should have carousel aria-roledescription', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('carousel')).toHaveAttribute('aria-roledescription', 'carousel');
  });

  it('should have group role on items', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('item-1')).toHaveAttribute('role', 'group');
  });

  it('should have slide aria-roledescription on items', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('item-1')).toHaveAttribute('aria-roledescription', 'slide');
  });

  it('should have aria-label on navigation buttons', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('previous')).toHaveAttribute('aria-label', 'Previous slide');
    expect(screen.getByTestId('next')).toHaveAttribute('aria-label', 'Next slide');
  });
});

describe('Carousel - Navigation', () => {
  it('should disable previous button at start', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('previous')).toBeDisabled();
  });

  it('should enable next button at start', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('next')).not.toBeDisabled();
  });

  it('should navigate to next slide when clicking next', () => {
    render(<TestCarousel />);

    const nextBtn = screen.getByTestId('next');
    fireEvent.click(nextBtn);

    // Previous should now be enabled
    expect(screen.getByTestId('previous')).not.toBeDisabled();
  });

  it('should navigate to previous slide when clicking previous', () => {
    render(<TestCarousel />);

    // Go to slide 2
    fireEvent.click(screen.getByTestId('next'));

    // Go back
    fireEvent.click(screen.getByTestId('previous'));

    // Previous should be disabled again
    expect(screen.getByTestId('previous')).toBeDisabled();
  });

  it('should disable next button at end', () => {
    render(<TestCarousel />);

    // Go to last slide
    fireEvent.click(screen.getByTestId('next')); // slide 2
    fireEvent.click(screen.getByTestId('next')); // slide 3

    expect(screen.getByTestId('next')).toBeDisabled();
  });
});

describe('Carousel - Loop Mode', () => {
  it('should enable previous at start when loop is true', () => {
    render(<TestCarousel loop />);

    expect(screen.getByTestId('previous')).not.toBeDisabled();
  });

  it('should enable next at end when loop is true', () => {
    render(<TestCarousel loop />);

    // Go to last slide
    fireEvent.click(screen.getByTestId('next'));
    fireEvent.click(screen.getByTestId('next'));

    expect(screen.getByTestId('next')).not.toBeDisabled();
  });

  it('should loop to last slide when clicking previous at start', () => {
    render(<TestCarousel loop />);

    // Click previous at start - should go to last
    fireEvent.click(screen.getByTestId('previous'));

    // Now at last slide, clicking next should go to first
    fireEvent.click(screen.getByTestId('next'));

    // Previous should now go to last again
    expect(screen.getByTestId('previous')).not.toBeDisabled();
  });
});

describe('Carousel - Keyboard Navigation', () => {
  it('should navigate with ArrowRight', () => {
    render(<TestCarousel />);

    const carousel = screen.getByTestId('carousel');
    carousel.focus();

    fireEvent.keyDown(carousel, { key: 'ArrowRight' });

    expect(screen.getByTestId('previous')).not.toBeDisabled();
  });

  it('should navigate with ArrowLeft', () => {
    render(<TestCarousel />);

    const carousel = screen.getByTestId('carousel');
    carousel.focus();

    // First go forward
    fireEvent.keyDown(carousel, { key: 'ArrowRight' });

    // Then go back
    fireEvent.keyDown(carousel, { key: 'ArrowLeft' });

    expect(screen.getByTestId('previous')).toBeDisabled();
  });

  it('should be focusable', () => {
    render(<TestCarousel />);

    const carousel = screen.getByTestId('carousel');
    expect(carousel).toHaveAttribute('tabindex', '0');
  });
});

describe('Carousel - Vertical Orientation', () => {
  it('should set vertical data-orientation', () => {
    render(
      <Carousel orientation="vertical" data-testid="carousel">
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    expect(screen.getByTestId('carousel')).toHaveAttribute('data-orientation', 'vertical');
  });

  it('should navigate with ArrowUp/ArrowDown when vertical', () => {
    render(
      <Carousel orientation="vertical" data-testid="carousel">
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselPrevious data-testid="previous" />
      </Carousel>,
    );

    const carousel = screen.getByTestId('carousel');
    carousel.focus();

    fireEvent.keyDown(carousel, { key: 'ArrowDown' });

    expect(screen.getByTestId('previous')).not.toBeDisabled();
  });
});

describe('Carousel - Indicators', () => {
  it('should render correct number of indicators', () => {
    render(
      <Carousel data-testid="carousel">
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
          <CarouselItem>Slide 3</CarouselItem>
        </CarouselContent>
        <CarouselIndicators data-testid="indicators" />
      </Carousel>,
    );

    const indicators = screen.getByTestId('indicators');
    const buttons = indicators.querySelectorAll('button');
    expect(buttons).toHaveLength(3);
  });

  it('should mark current indicator as active', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselIndicators data-testid="indicators" />
      </Carousel>,
    );

    const indicators = screen.getByTestId('indicators');
    const buttons = indicators.querySelectorAll('button');

    expect(buttons[0]).toHaveAttribute('data-active', 'true');
    expect(buttons[1]).not.toHaveAttribute('data-active');
  });

  it('should navigate when clicking indicator', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
          <CarouselItem>Slide 3</CarouselItem>
        </CarouselContent>
        <CarouselIndicators data-testid="indicators" />
        <CarouselPrevious data-testid="previous" />
      </Carousel>,
    );

    const indicators = screen.getByTestId('indicators');
    const buttons = indicators.querySelectorAll('button');

    // Click third indicator
    fireEvent.click(buttons[2]);

    // Should now be at last slide, previous should be enabled
    expect(screen.getByTestId('previous')).not.toBeDisabled();
  });

  it('should have tablist role', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselIndicators data-testid="indicators" />
      </Carousel>,
    );

    expect(screen.getByTestId('indicators')).toHaveAttribute('role', 'tablist');
  });

  it('should have tab role on indicator buttons', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselIndicators data-testid="indicators" />
      </Carousel>,
    );

    const indicators = screen.getByTestId('indicators');
    const buttons = indicators.querySelectorAll('button');

    expect(buttons[0]).toHaveAttribute('role', 'tab');
  });

  it('should have aria-selected on indicators', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <CarouselIndicators data-testid="indicators" />
      </Carousel>,
    );

    const indicators = screen.getByTestId('indicators');
    const buttons = indicators.querySelectorAll('button');

    expect(buttons[0]).toHaveAttribute('aria-selected', 'true');
    expect(buttons[1]).toHaveAttribute('aria-selected', 'false');
  });
});

describe('Carousel - Data Attributes', () => {
  it('should set data-carousel on root', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('carousel')).toHaveAttribute('data-carousel');
  });

  it('should set data-carousel-content on content', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('content')).toHaveAttribute('data-carousel-content');
  });

  it('should set data-carousel-item on items', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('item-1')).toHaveAttribute('data-carousel-item');
  });

  it('should set data-carousel-previous on previous button', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('previous')).toHaveAttribute('data-carousel-previous');
  });

  it('should set data-carousel-next on next button', () => {
    render(<TestCarousel />);

    expect(screen.getByTestId('next')).toHaveAttribute('data-carousel-next');
  });
});

describe('Carousel - Custom className', () => {
  it('should merge custom className on carousel', () => {
    render(
      <Carousel className="custom-carousel" data-testid="carousel">
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    expect(screen.getByTestId('carousel').className).toContain('custom-carousel');
  });

  it('should merge custom className on content', () => {
    render(
      <Carousel>
        <CarouselContent className="custom-content" data-testid="content">
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    expect(screen.getByTestId('content').className).toContain('custom-content');
  });

  it('should merge custom className on item', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem className="custom-item" data-testid="item">
            Slide 1
          </CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    expect(screen.getByTestId('item').className).toContain('custom-item');
  });
});

describe('Carousel - useCarousel Hook', () => {
  it('should throw when used outside Carousel', () => {
    const TestComponent = () => {
      useCarousel();
      return null;
    };

    expect(() => render(<TestComponent />)).toThrow('useCarousel must be used within Carousel');
  });
});

describe('Carousel - Custom Button Content', () => {
  it('should render custom content in previous button', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselPrevious data-testid="previous">Back</CarouselPrevious>
      </Carousel>,
    );

    expect(screen.getByTestId('previous')).toHaveTextContent('Back');
  });

  it('should render custom content in next button', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
        </CarouselContent>
        <CarouselNext data-testid="next">Forward</CarouselNext>
      </Carousel>,
    );

    expect(screen.getByTestId('next')).toHaveTextContent('Forward');
  });
});

describe('Carousel - registration (createMemory migration)', () => {
  function ItemCountProbe() {
    const { totalItems } = useCarousel();
    return <span data-testid="item-count">{totalItems}</span>;
  }

  it('counts each item exactly once under StrictMode (idempotent register-by-id)', () => {
    render(
      <StrictMode>
        <Carousel>
          <CarouselContent>
            <CarouselItem>Slide 1</CarouselItem>
            <CarouselItem>Slide 2</CarouselItem>
            <CarouselItem>Slide 3</CarouselItem>
          </CarouselContent>
          <ItemCountProbe />
        </Carousel>
      </StrictMode>,
    );
    // StrictMode double-invokes mount effects; idempotent register must not double-count.
    expect(screen.getByTestId('item-count').textContent).toBe('3');
  });

  it('recomputes the count when the item set changes (itemsVersion bump)', () => {
    const { rerender } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
        </CarouselContent>
        <ItemCountProbe />
      </Carousel>,
    );
    expect(screen.getByTestId('item-count').textContent).toBe('2');
    rerender(
      <Carousel>
        <CarouselContent>
          <CarouselItem>Slide 1</CarouselItem>
          <CarouselItem>Slide 2</CarouselItem>
          <CarouselItem>Slide 3</CarouselItem>
        </CarouselContent>
        <ItemCountProbe />
      </Carousel>,
    );
    expect(screen.getByTestId('item-count').textContent).toBe('3');
  });
});
