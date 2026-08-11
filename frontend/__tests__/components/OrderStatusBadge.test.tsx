import React from 'react';
import { render, screen } from '@testing-library/react';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';

describe('OrderStatusBadge component', () => {
  it('renders pending status', () => {
    render(<OrderStatusBadge status="pending" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('renders confirmed status', () => {
    render(<OrderStatusBadge status="confirmed" />);
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  it('renders shipped status', () => {
    render(<OrderStatusBadge status="shipped" />);
    expect(screen.getByText(/shipped/i)).toBeInTheDocument();
  });

  it('renders delivered status', () => {
    render(<OrderStatusBadge status="delivered" />);
    expect(screen.getByText(/delivered/i)).toBeInTheDocument();
  });

  it('renders cancelled status', () => {
    render(<OrderStatusBadge status="cancelled" />);
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  });
});
