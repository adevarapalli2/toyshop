'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Typography, Tag } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip, ResponsiveContainer, Legend } from 'recharts';
import { RootState } from '@/store/index';
import { inventoryService, InventoryKpi, AlertRow, MovementRow } from '@/services/inventoryService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import styles from './page.module.css';

const { Title, Text } = Typography;

const movementColor: Record<string, string> = {
  IN: '#10b981', OUT: '#ef4444', ADJUSTMENT: '#3b82f6',
  RETURN: '#8b5cf6', TRANSFER: '#f97316',
};

const catLabel = (c: string) => c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

export default function InventoryOverview() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const [kpi, setKpi] = useState<InventoryKpi | null>(null);
  const [chart, setChart] = useState<{ category: string; inStock: number; lowStock: number; outOfStock: number }[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [recent, setRecent] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!initializing && !user) router.replace('/login'); }, [user, initializing, router]);

  useEffect(() => {
    if (!user) return;
    inventoryService.overview().then(r => {
      setKpi(r.data.kpi);
      setChart(r.data.categoryChart.map(c => ({ ...c, category: catLabel(c.category) })));
      setAlerts(r.data.alerts);
      setRecent(r.data.recentMovements);
    }).finally(() => setLoading(false));
  }, [user]);

  if (initializing || !user) return null;

  const kpiCards = kpi ? [
    { label: 'Total SKUs',    value: kpi.totalSkus,   icon: '📦', color: '#1d4ed8', bg: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)', href: '/inventory/products' },
    { label: 'In Stock',      value: kpi.inStock,     icon: '✅', color: '#059669', bg: 'linear-gradient(135deg,#059669,#34d399)', href: '/inventory/products?stock=in_stock' },
    { label: 'Low Stock',     value: kpi.lowStock,    icon: '⚠️', color: '#d97706', bg: 'linear-gradient(135deg,#d97706,#fbbf24)', pulse: true, href: '/inventory/products?stock=low_stock' },
    { label: 'Out of Stock',  value: kpi.outOfStock,  icon: '🔴', color: '#dc2626', bg: 'linear-gradient(135deg,#dc2626,#f87171)', href: '/inventory/products?stock=out_of_stock' },
    { label: 'Inventory Value', value: `₹${kpi.totalValue.toLocaleString('en-IN')}`, icon: '💰', color: '#7c3aed', bg: 'linear-gradient(135deg,#7c3aed,#a78bfa)', href: '/inventory/products' },
  ] : [];

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>
        <TopBar title="Inventory" />
        <div className={styles.content}>

          {/* KPI Row */}
          <div className={styles.kpiRow}>
            {kpiCards.map(k => (
              <button key={k.label} className={styles.kpiCard} onClick={() => router.push(k.href)}>
                <div className={styles.kpiIconWrap} style={{ background: k.bg }}>
                  <span>{k.icon}</span>
                </div>
                <div>
                  <div className={`${styles.kpiValue} ${k.pulse ? styles.pulse : ''}`}
                    style={{ color: k.color }}>{loading ? '—' : k.value}</div>
                  <div className={styles.kpiLabel}>{k.label}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Quick nav chips */}
          <div className={styles.navChips}>
            {[
              { label: '📦 Products', href: '/inventory/products' },
              { label: '🔄 Movements', href: '/inventory/movements' },
              { label: '🚨 Alerts', href: '/inventory/alerts', badge: kpi ? kpi.lowStock + kpi.outOfStock : 0 },
            ].map(c => (
              <button key={c.href} className={styles.chip} onClick={() => router.push(c.href)}>
                {c.label}
                {c.badge ? <span className={styles.chipBadge}>{c.badge}</span> : null}
              </button>
            ))}
          </div>

          {/* Middle row */}
          <div className={styles.midRow}>
            {/* Category chart */}
            <div className={styles.chartCard}>
              <Title level={5} className={styles.cardTitle}>Stock by Category</Title>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chart} layout="vertical" margin={{ left: 12, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={110} />
                  <RechartsTip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inStock" name="In Stock" fill="#10b981" radius={[0,3,3,0]} stackId="a" />
                  <Bar dataKey="lowStock" name="Low Stock" fill="#f59e0b" radius={[0,0,0,0]} stackId="a" />
                  <Bar dataKey="outOfStock" name="Out of Stock" fill="#ef4444" radius={[0,3,3,0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Alerts panel */}
            <div className={styles.alertsCard}>
              <div className={styles.alertsHeader}>
                <Title level={5} className={styles.cardTitle}>🚨 Top Alerts</Title>
                <button className={styles.viewAll} onClick={() => router.push('/inventory/alerts')}>View all →</button>
              </div>
              <div className={styles.alertList}>
                {alerts.length === 0 && <div className={styles.noAlerts}>✅ All stock levels healthy</div>}
                {alerts.map(a => (
                  <div key={a.id} className={styles.alertRow}>
                    <div className={styles.alertLeft}>
                      <span className={`${styles.alertDot} ${a.quantity === 0 ? styles.dotRed : styles.dotAmber}`} />
                      <div>
                        <div className={styles.alertName}>{a.name}</div>
                        <div className={styles.alertSku}>{a.sku} · {a.binLocation || 'No bin'}</div>
                      </div>
                    </div>
                    <div className={styles.alertQty}>
                      <span className={a.quantity === 0 ? styles.qtyRed : styles.qtyAmber}>{a.quantity}</span>
                      <span className={styles.qtyMin}>/ {a.minStock} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent movements */}
          <div className={styles.movementsCard}>
            <div className={styles.movementsHeader}>
              <Title level={5} className={styles.cardTitle}>🔄 Recent Movements</Title>
              <button className={styles.viewAll} onClick={() => router.push('/inventory/movements')}>View all →</button>
            </div>
            <div className={styles.movTable}>
              <div className={styles.movThead}>
                <span>Time</span><span>Product</span><span>Type</span>
                <span>Qty</span><span>Before → After</span><span>Ref</span><span>By</span>
              </div>
              {recent.map(m => (
                <div key={m.id} className={styles.movRow}>
                  <span className={styles.movTime}>{new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className={styles.movProduct}><b>{m.productSku}</b> {m.productName}</span>
                  <span><Tag style={{ color: movementColor[m.movementType], borderColor: movementColor[m.movementType], background: `${movementColor[m.movementType]}15`, fontWeight: 700, borderRadius: 20, fontSize: 11 }}>{m.movementType}</Tag></span>
                  <span className={styles.movQty} style={{ color: movementColor[m.movementType] }}>
                    {['IN','RETURN'].includes(m.movementType) ? '+' : m.movementType === 'OUT' ? '-' : '±'}{m.quantity}
                  </span>
                  <span className={styles.movBefore}>{m.quantityBefore} → {m.quantityAfter}</span>
                  <span className={styles.movRef}>{m.referenceNo || '—'}</span>
                  <span className={styles.movBy}>{m.performedByName || '—'}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
