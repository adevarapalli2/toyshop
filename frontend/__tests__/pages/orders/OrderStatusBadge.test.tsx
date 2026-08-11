import React from 'react';
import { render, screen } from '@testing-library/react';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import PriorityBadge from '@/components/orders/PriorityBadge';

describe('Order status and priority badges', () => {
  it('pending order shows pending label', () => {
    render(<OrderStatusBadge status="pending" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('confirmed order shows confirmed label', () => {
    render(<OrderStatusBadge status="confirmed" />);
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  it('delivered order shows delivered label', () => {
    render(<OrderStatusBadge status="delivered" />);
    expect(screen.getByText(/delivered/i)).toBeInTheDocument();
  });

  it('priority badge normal shows normal label', () => {
    render(<PriorityBadge priority="normal" />);
    expect(screen.getByText(/normal/i)).toBeInTheDocument();
  });

  it('priority badge urgent shows urgent label', () => {
    render(<PriorityBadge priority="urgent" />);
    expect(screen.getByText(/urgent/i)).toBeInTheDocument();
  });
});
