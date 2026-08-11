import React from 'react';
import { render, screen } from '@testing-library/react';
import StockBadge from '@/components/inventory/StockBadge';

describe('StockBadge — inventory page integration', () => {
  it('shows correct quantity and max', () => {
    render(<StockBadge qty={30} min={5} max={200} status="in_stock" />);
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it('shows out_of_stock label for 0 quantity', () => {
    render(<StockBadge qty={0} min={0} max={100} status="out_of_stock" />);
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders overstock label correctly', () => {
    render(<StockBadge qty={500} min={10} max={100} status="overstock" />);
    expect(screen.getByText('Overstock')).toBeInTheDocument();
  });

  it('renders all 4 statuses without throwing', () => {
    const statuses = ['in_stock', 'low_stock', 'out_of_stock', 'overstock'] as const;
    statuses.forEach(s => {
      expect(() => render(<StockBadge qty={10} min={5} max={50} status={s} />)).not.toThrow();
    });
  });

  it('renders without bar when showBar is false', () => {
    const { container } = render(
      <StockBadge qty={50} min={10} max={100} status="in_stock" showBar={false} />
    );
    // No barFill class in DOM (CSS modules are mocked, class names are empty strings)
    const allDivs = container.querySelectorAll('div');
    // The bar track is not rendered — there should be fewer elements
    expect(allDivs.length).toBeLessThan(5);
  });
});
