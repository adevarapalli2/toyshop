import { ShipmentEvent, EVENT_ICONS } from '@/services/shipmentService';
import styles from './TrackingTimeline.module.css';

export default function TrackingTimeline({ events }: { events: ShipmentEvent[] }) {
  if (!events.length) return <div className={styles.empty}>No tracking events yet.</div>;
  const sorted = [...events].sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
  return (
    <div className={styles.wrap}>
      {sorted.map((evt, i) => (
        <div key={evt.id} className={`${styles.event} ${i === 0 ? styles.latest : ''}`}>
          <div className={styles.left}>
            <div className={styles.iconWrap} style={i === 0 ? { background: 'linear-gradient(135deg,#1d4ed8,#6366f1)' } : {}}>
              <span>{EVENT_ICONS[evt.eventType] ?? '📍'}</span>
            </div>
            {i < sorted.length - 1 && <div className={styles.connector} />}
          </div>
          <div className={styles.body}>
            <div className={styles.evtHeader}>
              <span className={`${styles.evtType} ${i === 0 ? styles.evtTypeLatest : ''}`}>
                {evt.eventType.replace(/_/g,' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className={styles.evtTime}>
                {new Date(evt.eventTime).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>
            {evt.location && <div className={styles.evtLoc}>📍 {evt.location}</div>}
            <div className={styles.evtDesc}>{evt.description}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
