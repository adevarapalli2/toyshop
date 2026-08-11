import React from 'react';
import { render, screen } from '@testing-library/react';
import ShipmentStatusBadge from '@/components/shipments/ShipmentStatusBadge';

describe('ShipmentStatusBadge component', () => {
  it('renders pending_pickup status', () => {
    render(<ShipmentStatusBadge status="pending_pickup" />);
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  it('renders in_transit status', () => {
    render(<ShipmentStatusBadge status="in_transit" />);
    expect(screen.getByText(/in.transit/i)).toBeInTheDocument();
  });

  it('renders delivered status', () => {
    render(<ShipmentStatusBadge status="delivered" />);
    expect(screen.getByText(/delivered/i)).toBeInTheDocument();
  });

  it('renders failed_delivery status', () => {
    render(<ShipmentStatusBadge status="failed_delivery" />);
    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it('renders returned status', () => {
    render(<ShipmentStatusBadge status="returned" />);
    expect(screen.getByText(/returned/i)).toBeInTheDocument();
  });
});
