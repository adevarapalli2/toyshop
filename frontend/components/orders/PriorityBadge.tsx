import { PRIORITY_META, Priority } from '@/services/orderService';
import styles from './OrderStatusBadge.module.css';

const icons: Record<Priority, string> = { normal: '🟢', high: '🟠', urgent: '🔴' };

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const m = PRIORITY_META[priority] ?? PRIORITY_META.normal;
  return (
    <span className={styles.badge} style={{ color: m.color, background: m.bg, borderColor: `${m.color}30` }}>
      {icons[priority]} {m.label}
    </span>
  );
}
