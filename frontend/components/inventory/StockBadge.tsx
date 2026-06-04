import styles from './StockBadge.module.css';
import type { StockStatus } from '@/services/inventoryService';

interface Props {
  qty: number; min: number; max: number;
  status: StockStatus; showBar?: boolean;
}

const label: Record<StockStatus, string> = {
  in_stock: 'In Stock', low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock', overstock: 'Overstock',
};

export default function StockBadge({ qty, min, max, status, showBar = true }: Props) {
  const pct = max > 0 ? Math.min(100, Math.round((qty / max) * 100)) : 0;
  return (
    <div className={styles.wrap}>
      <div className={`${styles.badge} ${styles[status]}`}>{label[status]}</div>
      <div className={styles.qtyRow}>
        <span className={`${styles.qty} ${styles[status]}`}>{qty}</span>
        <span className={styles.maxLabel}>/ {max}</span>
      </div>
      {showBar && (
        <div className={styles.barTrack}>
          <div className={`${styles.barFill} ${styles[`bar_${status}`]}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
