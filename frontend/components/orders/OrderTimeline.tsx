import { STATUS_META, OrderStatus, TimelineEvent } from '@/services/orderService';
import styles from './OrderTimeline.module.css';

const ALL_STEPS: OrderStatus[] = ['pending','confirmed','picking','packed','shipped','delivered'];

export default function OrderTimeline({ timeline, currentStatus }: { timeline: TimelineEvent[]; currentStatus: OrderStatus }) {
  const isCancelled = currentStatus === 'cancelled' || currentStatus === 'returned';
  const steps = isCancelled ? ['pending', currentStatus] : ALL_STEPS;

  return (
    <div className={styles.wrap}>
      {steps.map((step, i) => {
        const event = timeline.find(t => t.toStatus === step);
        const meta = STATUS_META[step as OrderStatus];
        const done = timeline.some(t => t.toStatus === step);
        const active = step === currentStatus;
        return (
          <div key={step} className={`${styles.step} ${done ? styles.done : ''} ${active ? styles.active : ''}`}>
            <div className={styles.left}>
              <div className={styles.dot} style={done ? { background: meta.color, borderColor: meta.color } : {}}>
                {done ? '✓' : <span style={{ opacity: 0.3 }}>{i + 1}</span>}
              </div>
              {i < steps.length - 1 && <div className={`${styles.line} ${done ? styles.lineDone : ''}`} style={done ? { background: meta.color } : {}} />}
            </div>
            <div className={styles.info}>
              <div className={styles.stepLabel} style={done ? { color: meta.color } : {}}>{meta?.icon} {meta?.label}</div>
              {event ? (
                <>
                  <div className={styles.stepTime}>{new Date(event.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</div>
                  <div className={styles.stepBy}>by {event.changedByName || 'System'}</div>
                </>
              ) : (
                <div className={styles.stepPending}>Pending</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
