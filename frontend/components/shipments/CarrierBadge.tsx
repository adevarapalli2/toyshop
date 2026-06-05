import { CARRIER_META } from '@/services/shipmentService';
import styles from './Badges.module.css';
export default function CarrierBadge({ carrier }: { carrier: string }) {
  const m = CARRIER_META[carrier] ?? { color: '#64748b', bg: '#f1f5f9', abbr: carrier.slice(0,3) };
  return <span className={styles.carrier} style={{ color: m.color, background: m.bg, borderColor: `${m.color}25` }}>{carrier}</span>;
}
