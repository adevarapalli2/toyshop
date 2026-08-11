import React from 'react';
import { render, screen } from '@testing-library/react';
import StockBadge from '@/components/inventory/StockBadge';

describe('StockBadge component', () => {
  it('renders In Stock badge for in_stock status', () => {
    render(<StockBadge qty={50} min={10} max={100} status="in_stock" />);
    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('renders Low Stock badge for low_stock status', () => {
    render(<StockBadge qty={5} min={10} max={100} status="low_stock" />);
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
  });

  it('renders Out of Stock badge when qty is zero', () => {
    render(<StockBadge qty={0} min={10} max={100} status="out_of_stock" />);
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders Overstock badge for overstock status', () => {
    render(<StockBadge qty={120} min={10} max={100} status="overstock" />);
    expect(screen.getByText('Overstock')).toBeInTheDocument();
  });

  it('hides the bar track when showBar is false', () => {
    const { container } = render(
      <StockBadge qty={50} min={10} max={100} status="in_stock" showBar={false} />
    );
    expect(container.querySelector('[class*="barTrack"]')).toBeNull();
  });
});
