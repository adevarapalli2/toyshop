import { STATUS_META, ShipStatus } from '@/services/shipmentService';
import styles from './Badges.module.css';
export default function ShipmentStatusBadge({ status }: { status: ShipStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.pending_pickup;
  return <span className={styles.badge} style={{ color: m.color, background: m.bg, borderColor: `${m.color}30` }}>{m.icon} {m.label}</span>;
}
