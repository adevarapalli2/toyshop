'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select, Tag } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTip, ResponsiveContainer, Legend } from 'recharts';
import { RootState } from '@/store/index';
import { inventoryService, InventoryKpi, AlertRow, MovementRow } from '@/services/inventoryService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import styles from './page.module.css';

const movementColor: Record<string, string> = {
  IN: '#10b981', OUT: '#ef4444', ADJUSTMENT: '#3b82f6',
  RETURN: '#8b5cf6', TRANSFER: '#f97316',
};
const catLabel = (c: string) => c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - i);

type RelativeKey = 'today' | '7d' | '30d' | '90d' | 'month' | 'year' | 'custom';
const RELATIVE: { key: RelativeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d',    label: 'Last 7 Days' },
  { key: '30d',   label: 'Last 30 Days' },
  { key: '90d',   label: 'Last 90 Days' },
  { key: 'month', label: 'This Month' },
  { key: 'year',  label: 'This Year' },
];

function buildDateRange(rel: RelativeKey, month: number, year: number): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  if (rel === 'today') {
    const t = fmt(now); return { from: t, to: t };
  }
  if (rel === '7d') {
    const f = new Date(now); f.setDate(f.getDate() - 6);
    return { from: fmt(f), to: fmt(now) };
  }
  if (rel === '30d') {
    const f = new Date(now); f.setDate(f.getDate() - 29);
    return { from: fmt(f), to: fmt(now) };
  }
  if (rel === '90d') {
    const f = new Date(now); f.setDate(f.getDate() - 89);
    return { from: fmt(f), to: fmt(now) };
  }
  if (rel === 'month') {
    const from = `${now.getFullYear()}-${pad(now.getMonth()+1)}-01`;
    return { from, to: fmt(now) };
  }
  if (rel === 'year') {
    return { from: `${now.getFullYear()}-01-01`, to: fmt(now) };
  }
  // custom month+year
  const lastDay = new Date(year, month, 0).getDate();
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${lastDay}` };
}

export default function InventoryOverview() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);

  const [kpi, setKpi] = useState<InventoryKpi | null>(null);
  const [chart, setChart] = useState<{ category: string; inStock: number; lowStock: number; outOfStock: number }[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [recent, setRecent] = useState<MovementRow[]>([]);
  const [periodSummary, setPeriodSummary] = useState<{ totalIn: number; totalOut: number; totalAdj: number; count: number } | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [relative, setRelative] = useState<RelativeKey>('30d');
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1);
  const [selYear, setSelYear] = useState(currentYear);

  useEffect(() => { if (!initializing && !user) router.replace('/login'); }, [user, initializing, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { from, to } = buildDateRange(relative, selMonth, selYear);
    try {
      const r = await inventoryService.overview({ from, to });
      setKpi(r.data.kpi);
      setChart(r.data.categoryChart.map(c => ({ ...c, category: catLabel(c.category) })));
      setAlerts(r.data.alerts);
      setRecent(r.data.recentMovements);
      setPeriodSummary(r.data.periodSummary ?? null);
    } finally { setLoading(false); }
  }, [user, relative, selMonth, selYear]);

  useEffect(() => { load(); }, [load]);

  const handleRelative = (key: RelativeKey) => {
    setRelative(key);
  };

  if (initializing || !user) return null;

  const { from, to } = buildDateRange(relative, selMonth, selYear);
  const dateLabel = relative === 'custom'
    ? `${MONTHS[selMonth-1]} ${selYear}`
    : RELATIVE.find(r => r.key === relative)?.label ?? '';

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

          {/* ── Date Filter Bar ──────────────────────────── */}
          <div className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <span className={styles.filterLabel}>📅 Period:</span>
              <div className={styles.relChips}>
                {RELATIVE.map(r => (
                  <button key={r.key}
                    className={`${styles.relChip} ${relative === r.key && relative !== 'custom' ? styles.relChipActive : ''}`}
                    onClick={() => handleRelative(r.key)}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.filterRight}>
              <Select
                value={selMonth}
                onChange={v => { setSelMonth(v); setRelative('custom'); }}
                className={styles.filterSelect}
                options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
              />
              <Select
                value={selYear}
                onChange={v => { setSelYear(v); setRelative('custom'); }}
                className={styles.filterSelect}
                options={YEARS.map(y => ({ value: y, label: String(y) }))}
              />
              <span className={styles.dateRange}>{from} → {to}</span>
            </div>
          </div>

          {/* ── KPI Row ────────────────────────────────── */}
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

          {/* ── Period Summary Strip ─────────────────────── */}
          {periodSummary && (
            <div className={styles.periodStrip}>
              <span className={styles.periodTitle}>📊 {dateLabel} movements:</span>
              <div className={styles.periodStats}>
                <span className={styles.pStat} style={{ color: '#10b981' }}>
                  <b>+{Number(periodSummary.totalIn).toLocaleString()}</b> Stock In
                </span>
                <span className={styles.pDivider}>·</span>
                <span className={styles.pStat} style={{ color: '#ef4444' }}>
                  <b>−{Number(periodSummary.totalOut).toLocaleString()}</b> Stock Out
                </span>
                <span className={styles.pDivider}>·</span>
                <span className={styles.pStat} style={{ color: '#3b82f6' }}>
                  <b>{Number(periodSummary.totalAdj)}</b> Adjustments
                </span>
                <span className={styles.pDivider}>·</span>
                <span className={styles.pStat} style={{ color: '#64748b' }}>
                  <b>{Number(periodSummary.count)}</b> Total events
                </span>
              </div>
              <button className={styles.viewMovBtn} onClick={() => router.push('/inventory/movements')}>
                View all →
              </button>
            </div>
          )}

          {/* ── Quick Nav ────────────────────────────────── */}
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

          {/* ── Middle Row ────────────────────────────────── */}
          <div className={styles.midRow}>
            <div className={styles.chartCard}>
              <div className={styles.cardTitle}>Stock by Category</div>
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

            <div className={styles.alertsCard}>
              <div className={styles.alertsHeader}>
                <div className={styles.cardTitle}>🚨 Top Alerts</div>
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

          {/* ── Recent Movements ───────────────────────────── */}
          <div className={styles.movementsCard}>
            <div className={styles.movementsHeader}>
              <div className={styles.cardTitle}>🔄 Movements — <span className={styles.periodBadge}>{dateLabel}</span></div>
              <button className={styles.viewAll} onClick={() => router.push('/inventory/movements')}>View all →</button>
            </div>
            {recent.length === 0 ? (
              <div className={styles.noMovements}>No movements recorded in this period</div>
            ) : (
              <div className={styles.movTable}>
                <div className={styles.movThead}>
                  <span>Time</span><span>Product</span><span>Type</span>
                  <span>Qty</span><span>Before → After</span><span>Ref</span><span>By</span>
                </div>
                {recent.map(m => (
                  <div key={m.id} className={styles.movRow}>
                    <span className={styles.movTime}>{new Date(m.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
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
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
