'use client';

import styles from './WarehousePanel.module.css';

export default function WarehousePanel() {
  return (
    <div className={styles.panel}>
      <div className={styles.overlay} />

      <div className={styles.content}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🏭</span>
          <div>
            <div className={styles.brandName}>ToyShop WMS</div>
            <div className={styles.brandSub}>Warehouse Management System</div>
          </div>
        </div>

        <div className={styles.scene}>
          <div className={styles.shelves}>
            <div className={styles.shelf}>
              <div className={`${styles.box} ${styles.boxRed}`}>🧸</div>
              <div className={`${styles.box} ${styles.boxBlue}`}>🎮</div>
              <div className={`${styles.box} ${styles.boxYellow}`}>🪀</div>
              <div className={`${styles.box} ${styles.boxGreen}`}>🎯</div>
            </div>
            <div className={styles.shelfBar} />
            <div className={styles.shelf}>
              <div className={`${styles.box} ${styles.boxPurple}`}>🎲</div>
              <div className={`${styles.box} ${styles.boxOrange}`}>🚗</div>
              <div className={`${styles.box} ${styles.boxRed}`}>🤖</div>
              <div className={`${styles.box} ${styles.boxBlue}`}>🎪</div>
            </div>
            <div className={styles.shelfBar} />
            <div className={styles.shelf}>
              <div className={`${styles.box} ${styles.boxYellow}`}>🎨</div>
              <div className={`${styles.box} ${styles.boxGreen}`}>🧩</div>
              <div className={`${styles.box} ${styles.boxPurple}`}>🎭</div>
              <div className={`${styles.box} ${styles.boxOrange}`}>🪁</div>
            </div>
          </div>

          <div className={styles.forklift}>
            <span>🚛</span>
            <div className={styles.forkliftLabel}>Automated Tracking</div>
          </div>

          <div className={styles.floatingBox1}>📦</div>
          <div className={styles.floatingBox2}>📦</div>
          <div className={styles.floatingBox3}>📦</div>
        </div>

        <div className={styles.tagline}>
          Smart Warehouse. Happy Customers.
        </div>

        <div className={styles.badges}>
          <div className={styles.badge}>
            <span>📦</span> Real-time Inventory
          </div>
          <div className={styles.badge}>
            <span>🚛</span> Shipment Tracking
          </div>
          <div className={styles.badge}>
            <span>📊</span> Analytics
          </div>
        </div>
      </div>
    </div>
  );
}
