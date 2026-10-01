import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

const Boom = () => {
  throw new Error('kabel wyrwany');
};

describe('ErrorBoundary', () => {
  it('shows the "under reconstruction" screen with the error tucked into details', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Apka w przebudowie')).toBeInTheDocument();
    expect(screen.getByText(/Techniczna nornica grzebie w kodzie/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Odśwież stronę' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć na start' })).toBeInTheDocument();
    expect(screen.getByText(/kabel wyrwany/)).toBeInTheDocument();
    spy.mockRestore();
  });

  it('renders children when nothing breaks', () => {
    render(
      <ErrorBoundary>
        <p>wszystko gra</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('wszystko gra')).toBeInTheDocument();
  });
});
