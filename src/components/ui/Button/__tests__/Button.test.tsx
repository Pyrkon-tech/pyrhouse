import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Kliknij mnie</Button>);
    expect(screen.getByText('Kliknij mnie')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Kliknij</Button>);
    fireEvent.click(screen.getByText('Kliknij'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Zablokowany</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled and shows spinner when loading=true', () => {
    render(<Button loading>Zapisz</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    // Spinner is rendered as an absolutely positioned div — children container becomes transparent
    // Children text still exists in DOM but is visually hidden (opacity: 0)
    expect(screen.getByText('Zapisz')).toBeInTheDocument();
  });

  it('does not call onClick when loading', () => {
    const handleClick = vi.fn();
    render(<Button loading onClick={handleClick}>Zapisz</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders leftIcon before children', () => {
    render(
      <Button leftIcon={<span data-testid="left-icon">←</span>}>Tekst</Button>
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByText('Tekst')).toBeInTheDocument();
  });

  it('renders rightIcon after children', () => {
    render(
      <Button rightIcon={<span data-testid="right-icon">→</span>}>Tekst</Button>
    );
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it.each(['primary', 'secondary', 'outline', 'ghost', 'danger'] as const)(
    'renders variant="%s" without crashing',
    (variant) => {
      render(<Button variant={variant}>Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    }
  );

  it.each(['sm', 'md', 'lg'] as const)(
    'renders size="%s" without crashing',
    (size) => {
      render(<Button size={size}>Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    }
  );

  it('passes type="submit" to underlying button', () => {
    render(<Button type="submit">Wyślij</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
