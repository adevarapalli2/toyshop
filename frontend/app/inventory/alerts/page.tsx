'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Button, message, Tag } from 'antd';
import { ReloadOutlined, SwapOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { inventoryService, AlertRow, ProductRow } from '@/services/inventoryService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import StockAdjustModal from '@/components/inventory/StockAdjustModal';
import styles from './page.module.css';

const catColor: Record<string, string> = {
  'building-sets':'blue','dolls':'pink','remote-control':'orange','board-games':'green',
  'electronic':'purple','arts-crafts':'magenta','plush':'volcano','outdoor':'cyan','action-figures':'red','puzzles':'gold',
};

export default function AlertsPage() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const selectedWarehouse = useSelector((s: RootState) => s.warehouse.selected);
  const [outOfStock, setOutOfStock] = useState<AlertRow[]>([]);
  const [lowStock, setLowStock] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustProduct, setAdjustProduct] = useState<Partial<ProductRow> | null>(null);

  useEffect(() => { if (!initializing && !user) router.replace('/login'); }, [user, initializing, router]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await inventoryService.alerts({ warehouse: selectedWarehouse });
      setOutOfStock(r.data.outOfStock);
      setLowStock(r.data.lowStock);
    } catch { message.error('Failed to load alerts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user, selectedWarehouse]); // eslint-disable-line

  const allClear = !loading && outOfStock.length === 0 && lowStock.length === 0;

  const AlertCard = ({ item, type }: { item: AlertRow; type: 'oos' | 'low' }) => (
    <div className={`${styles.alertCard} ${type === 'oos' ? styles.oos : styles.low}`}>
      <div className={styles.alertTop}>
        <div className={styles.alertAvatar} style={{ background: type === 'oos' ? 'linear-gradient(135deg,#dc2626,#f87171)' : 'linear-gradient(135deg,#d97706,#fbbf24)' }}>
          {type === 'oos' ? '🔴' : '⚠️'}
        </div>
        <div className={styles.alertInfo}>
          <div className={styles.alertName}>{item.name}</div>
          <div className={styles.alertMeta}>
            <span className={styles.alertSku}>{item.sku}</span>
            <Tag color={catColor[item.category] || 'default'} className={styles.catTag}>{item.category.replace(/-/g,' ')}</Tag>
          </div>
        </div>
        <Button size="small" icon={<SwapOutlined />} className={styles.adjustBtn}
          onClick={() => setAdjustProduct({ id: item.id, name: item.name, sku: item.sku, quantity: item.quantity, available: item.quantity, minStock: item.minStock, maxStock: 100 } as ProductRow)}>
          Adjust
        </Button>
      </div>
      <div className={styles.alertStats}>
        <div className={styles.stat}>
          <div className={`${styles.statVal} ${type === 'oos' ? styles.valRed : styles.valAmber}`}>{item.quantity}</div>
          <div className={styles.statLabel}>Current Stock</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statVal}>{item.minStock}</div>
          <div className={styles.statLabel}>Min Required</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={`${styles.statVal} ${styles.valRed}`}>{item.minStock - item.quantity}</div>
          <div className={styles.statLabel}>Units Needed</div>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.stat}>
          <div className={styles.statVal}>{item.binLocation || '—'}</div>
          <div className={styles.statLabel}>Bin Location</div>
        </div>
      </div>
    </div>
  );

  if (initializing || !user) return null;

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>
        <TopBar title="Stock Alerts" />
        <div className={styles.content}>
          <div className={styles.header}>
            <div>
              <div className={styles.pageTitle}>🚨 Stock Alerts</div>
              <div className={styles.pageSub}>Items requiring immediate restocking attention</div>
            </div>
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          </div>

          {allClear && (
            <div className={styles.allClear}>
              <div className={styles.allClearIcon}>✅</div>
              <div className={styles.allClearTitle}>All Stock Levels Healthy!</div>
              <div className={styles.allClearSub}>No items are below minimum threshold right now.</div>
            </div>
          )}

          {outOfStock.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionDot} style={{ background: '#dc2626' }} />
                <span className={styles.sectionTitle}>Out of Stock</span>
                <span className={styles.sectionCount}>{outOfStock.length} item{outOfStock.length > 1 ? 's' : ''}</span>
              </div>
              <div className={styles.grid}>
                {outOfStock.map(a => <AlertCard key={a.id} item={a} type="oos" />)}
              </div>
            </div>
          )}

          {lowStock.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionDot} style={{ background: '#d97706' }} />
                <span className={styles.sectionTitle}>Low Stock</span>
                <span className={styles.sectionCount}>{lowStock.length} item{lowStock.length > 1 ? 's' : ''}</span>
              </div>
              <div className={styles.grid}>
                {lowStock.map(a => <AlertCard key={a.id} item={a} type="low" />)}
              </div>
            </div>
          )}
        </div>
      </main>
      <StockAdjustModal product={adjustProduct as ProductRow} warehouse={selectedWarehouse} open={!!adjustProduct} onClose={() => setAdjustProduct(null)} onSuccess={() => { setAdjustProduct(null); load(); }} />
    </div>
  );
}
