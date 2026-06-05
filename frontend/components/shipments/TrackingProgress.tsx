import { STATUS_META, ShipStatus } from '@/services/shipmentService';
import styles from './TrackingProgress.module.css';

const STEPS: ShipStatus[] = ['pending_pickup','picked_up','in_transit','out_for_delivery','delivered'];

export default function TrackingProgress({ status }: { status: ShipStatus }) {
  const isFailed = status === 'failed_delivery' || status === 'returned';
  const currentIdx = isFailed ? 3 : STEPS.indexOf(status);
  return (
    <div className={styles.wrap}>
      {STEPS.map((step, i) => {
        const m = STATUS_META[step];
        const done = i <= currentIdx && !isFailed;
        const active = i === currentIdx && !isFailed;
        return (
          <div key={step} className={styles.step}>
            <div className={`${styles.dot} ${done ? styles.dotDone : ''} ${active ? styles.dotActive : ''}`}
              style={done ? { background: m.color, borderColor: m.color } : active ? { borderColor: m.color } : {}}>
              {done && !active ? '✓' : m.icon}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`${styles.line} ${i < currentIdx && !isFailed ? styles.lineDone : ''}`}
                style={i < currentIdx && !isFailed ? { background: STATUS_META[STEPS[i]].color } : {}} />
            )}
            <div className={styles.label} style={done||active ? { color: m.color, fontWeight: 700 } : {}}>{m.label}</div>
          </div>
        );
      })}
      {isFailed && (
        <div className={styles.failedNote}>
          <span style={{ color: '#dc2626', fontWeight: 700 }}>❌ {STATUS_META[status]?.label}</span>
        </div>
      )}
    </div>
  );
}
