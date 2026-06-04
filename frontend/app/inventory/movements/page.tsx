'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Table, Input, Tag, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { inventoryService, MovementRow, MovementType } from '@/services/inventoryService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import styles from './page.module.css';

const TYPE_META: Record<MovementType, { color: string; bg: string; label: string; symbol: string }> = {
  IN:         { color: '#065f46', bg: '#d1fae5', label: 'Stock In',    symbol: '+' },
  OUT:        { color: '#991b1b', bg: '#fee2e2', label: 'Stock Out',   symbol: '−' },
  ADJUSTMENT: { color: '#1e40af', bg: '#dbeafe', label: 'Adjustment',  symbol: '±' },
  RETURN:     { color: '#5b21b6', bg: '#ede9fe', label: 'Return',      symbol: '+' },
  TRANSFER:   { color: '#92400e', bg: '#fef3c7', label: 'Transfer',    symbol: '→' },
};

const TYPES: MovementType[] = ['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'TRANSFER'];

export default function MovementsPage() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const [rows, setRows] = useState<MovementRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { if (!initializing && !user) router.replace('/login'); }, [user, initializing, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await inventoryService.movements({ search: search || undefined, type: typeFilter || undefined, page, limit: 25 });
      setRows(r.data.data);
    } catch { message.error('Failed to load movements'); }
    finally { setLoading(false); }
  }, [search, typeFilter, page]);

  useEffect(() => { if (user) load(); }, [load, user]);

  const columns: ColumnsType<MovementRow> = [
    {
      title: 'Date & Time', dataIndex: 'createdAt', width: 140,
      render: (d: string) => (
        <div>
          <div className={styles.dateMain}>{new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}</div>
          <div className={styles.dateTime}>{new Date(d).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })}</div>
        </div>
      ),
    },
    {
      title: 'Product', key: 'prod', width: 220,
      render: (_, r) => (
        <div>
          <span className={styles.sku}>{r.productSku}</span>
          <div className={styles.prodName}>{r.productName}</div>
        </div>
      ),
    },
    {
      title: 'Type', dataIndex: 'movementType', width: 120,
      render: (t: MovementType) => {
        const m = TYPE_META[t];
        return <Tag style={{ color: m.color, background: m.bg, borderColor: m.bg, fontWeight: 700, borderRadius: 20 }}>{m.label}</Tag>;
      },
    },
    {
      title: 'Qty', key: 'qty', width: 80,
      render: (_, r) => {
        const m = TYPE_META[r.movementType as MovementType];
        return <span className={styles.qty} style={{ color: m.color }}>{m.symbol}{r.quantity}</span>;
      },
    },
    {
      title: 'Before → After', key: 'ba', width: 120,
      render: (_, r) => (
        <span className={styles.before}>{r.quantityBefore} <span className={styles.arrow}>→</span> <b>{r.quantityAfter}</b></span>
      ),
    },
    { title: 'Reference', dataIndex: 'referenceNo', width: 130, render: (v: string) => <span className={styles.ref}>{v || '—'}</span> },
    { title: 'Notes', dataIndex: 'notes', ellipsis: true, render: (v: string) => <span className={styles.notes}>{v || '—'}</span> },
    { title: 'Performed By', dataIndex: 'performedByName', width: 130, render: (v: string) => <span className={styles.by}>{v || '—'}</span> },
  ];

  if (initializing || !user) return null;

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>
        <TopBar title="Stock Movements" />
        <div className={styles.content}>
          <div className={styles.header}>
            <div>
              <div className={styles.pageTitle}>🔄 Stock Movements</div>
              <div className={styles.pageSub}>Full audit trail of all inventory changes</div>
            </div>
          </div>

          {/* Type filter chips */}
          <div className={styles.typeFilters}>
            <button className={`${styles.typeChip} ${typeFilter === '' ? styles.typeActive : ''}`} onClick={() => setTypeFilter('')}>All Types</button>
            {TYPES.map(t => {
              const m = TYPE_META[t];
              return (
                <button key={t} className={`${styles.typeChip} ${typeFilter === t ? styles.typeActive : ''}`}
                  style={typeFilter === t ? { color: m.color, background: m.bg, borderColor: m.color } : {}}
                  onClick={() => setTypeFilter(typeFilter === t ? '' : t)}>
                  {m.symbol} {m.label}
                </button>
              );
            })}
          </div>

          <div className={styles.filterRow}>
            <Input prefix={<SearchOutlined />} placeholder="Search by product name…" value={search} onChange={e => setSearch(e.target.value)} allowClear className={styles.search} />
            <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Refresh</Button>
          </div>

          <div className={styles.tableWrap}>
            <Table columns={columns} dataSource={rows} rowKey="id" loading={loading} scroll={{ x: 900 }}
              pagination={{ pageSize: 25, onChange: setPage, showTotal: t => `${t} movements` }} />
          </div>
        </div>
      </main>
    </div>
  );
}
