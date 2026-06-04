'use client';

import styles from './WarehousePanel.module.css';

const crates = [
  ['c1','c2','c3'], ['c4','c5','c6'],
  ['c7','c8','c9'], ['c10','c11','c12'],
];
const crateEmojis = ['🧸','🎮','🪀','🎯','🎲','🚗','🤖','🎪','🎨','🧩','🎭','🪁'];

export default function WarehousePanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.overlay} />

      <div className={styles.content}>

        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIconWrap}>🏭</div>
          <div>
            <div className={styles.brandName}>ToyShop WMS</div>
            <div className={styles.brandSub}>Warehouse Management System</div>
          </div>
        </div>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroTitle}>
            The Smarter Way<br />to Run Your <span>Warehouse</span>
          </div>
          <div className={styles.heroSub}>
            Real-time inventory tracking, automated order fulfillment, and powerful analytics — all in one platform built for toy shop operations.
          </div>
        </div>

        {/* KPI Stats */}
        <div className={styles.stats}>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>📦</span>
            <div className={styles.statValue}>12,450</div>
            <div className={styles.statLabel}>Active SKUs</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>🚛</span>
            <div className={styles.statValue}>99.8%</div>
            <div className={styles.statLabel}>Order Accuracy</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statIcon}>⚡</span>
            <div className={styles.statValue}>24/7</div>
            <div className={styles.statLabel}>Live Tracking</div>
          </div>
        </div>

        {/* Warehouse Scene */}
        <div className={styles.scene}>
          <div className={styles.amb1 + ' ' + styles.amb}>📦</div>
          <div className={styles.amb2 + ' ' + styles.amb}>🧸</div>
          <div className={styles.amb3 + ' ' + styles.amb}>📦</div>
          <div className={styles.amb4 + ' ' + styles.amb}>🎮</div>

          <div>
            <div className={styles.rackWrap}>
              {crates.map((row, ri) => (
                <div key={ri} className={styles.rack}>
                  {[0, 1].map((rowIdx) => (
                    <div key={rowIdx} className={styles.rackRow}>
                      {row.map((cls, ci) => (
                        <div key={ci} className={`${styles.crate} ${styles[cls]}`}>
                          {crateEmojis[ri * 3 + ci]}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <div className={styles.rackPost} />
            </div>
            <div className={styles.floor} />
          </div>
        </div>

        {/* Feature Pills */}
        <div className={styles.pills}>
          <div className={styles.pill}><span className={styles.pillDot} />Real-time Inventory</div>
          <div className={styles.pill}><span className={styles.pillDot} />Shipment Tracking</div>
          <div className={styles.pill}><span className={styles.pillDot} />Analytics & Reports</div>
          <div className={styles.pill}><span className={styles.pillDot} />Multi-user Access</div>
        </div>

      </div>
    </div>
  );
}
