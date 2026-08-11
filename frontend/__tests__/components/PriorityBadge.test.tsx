import React from 'react';
import { render, screen } from '@testing-library/react';
import PriorityBadge from '@/components/orders/PriorityBadge';

describe('PriorityBadge component', () => {
  it('renders Normal priority with green indicator', () => {
    render(<PriorityBadge priority="normal" />);
    expect(screen.getByText(/normal/i)).toBeInTheDocument();
    expect(screen.getByText(/🟢/)).toBeInTheDocument();
  });

  it('renders High priority with orange indicator', () => {
    render(<PriorityBadge priority="high" />);
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/🟠/)).toBeInTheDocument();
  });

  it('renders Urgent priority with red indicator', () => {
    render(<PriorityBadge priority="urgent" />);
    expect(screen.getByText(/urgent/i)).toBeInTheDocument();
    expect(screen.getByText(/🔴/)).toBeInTheDocument();
  });

  it('falls back to normal meta for unknown priority', () => {
    // @ts-expect-error - testing unknown priority
    render(<PriorityBadge priority="unknown" />);
    expect(screen.getByText(/normal/i)).toBeInTheDocument();
  });

  it('badge has inline color styles applied', () => {
    const { container } = render(<PriorityBadge priority="urgent" />);
    const badge = container.querySelector('span') as HTMLElement;
    expect(badge.style.color).not.toBe('');
  });
});
