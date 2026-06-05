import { STATUS_META, OrderStatus } from '@/services/orderService';
import styles from './OrderStatusBadge.module.css';

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.pending;
  return (
    <span className={styles.badge} style={{ color: m.color, background: m.bg, borderColor: `${m.color}30` }}>
      {m.icon} {m.label}
    </span>
  );
}
