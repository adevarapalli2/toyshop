'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Table, Input, Button, Tag, Tooltip, Popconfirm, message, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, SearchOutlined, EditOutlined, SwapOutlined, StopOutlined, ReloadOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { productService, ProductRow, StockStatus } from '@/services/inventoryService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import StockBadge from '@/components/inventory/StockBadge';
import AddProductModal from '@/components/inventory/AddProductModal';
import StockAdjustModal from '@/components/inventory/StockAdjustModal';
import styles from './page.module.css';

const CATS = ['action-figures','board-games','building-sets','electronic','outdoor','arts-crafts','puzzles','dolls','remote-control','plush'];
const STOCK_FILTERS: { label: string; value: string; color: string }[] = [
  { label: 'All', value: '', color: '#64748b' },
  { label: '✅ In Stock', value: 'in_stock', color: '#059669' },
  { label: '⚠️ Low Stock', value: 'low_stock', color: '#d97706' },
  { label: '🔴 Out of Stock', value: 'out_of_stock', color: '#dc2626' },
  { label: '🔵 Overstock', value: 'overstock', color: '#1d4ed8' },
];

function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const selectedWarehouse = useSelector((s: RootState) => s.warehouse.selected);
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockFilter, setStockFilter] = useState(searchParams.get('stock') ?? '');
  const [addOpen, setAddOpen] = useState(false);
  const [adjustProduct, setAdjustProduct] = useState<ProductRow | null>(null);

  useEffect(() => { if (!initializing && !user) router.replace('/login'); }, [user, initializing, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await productService.list({ search: search || undefined, category: category || undefined, stock: stockFilter || undefined, warehouse: selectedWarehouse });
      setRows(r.data.data);
    } catch { message.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [search, category, stockFilter, selectedWarehouse]);

  useEffect(() => { if (user) load(); }, [load, user]);

  const deactivate = async (id: number) => {
    try { await productService.deactivate(id); message.success('Product deactivated'); load(); }
    catch { message.error('Failed'); }
  };

  const columns: ColumnsType<ProductRow> = [
    {
      title: 'SKU', dataIndex: 'sku', width: 110,
      render: (s: string) => <span className={styles.sku}>{s}</span>,
    },
    {
      title: 'Product', key: 'product', width: 220,
      render: (_, r) => (
        <div>
          <div className={styles.prodName}>{r.name}</div>
          <Tag color="default" className={styles.catTag}>{r.category.replace(/-/g,' ')}</Tag>
        </div>
      ),
    },
    {
      title: 'Stock Level', key: 'stock', width: 140,
      render: (_, r) => <StockBadge qty={r.quantity} min={r.minStock} max={r.maxStock} status={r.stockStatus as StockStatus} />,
    },
    {
      title: 'Available', dataIndex: 'available', width: 80,
      render: (v: number) => <span className={styles.avail}>{v}</span>,
    },
    {
      title: 'Min / Max', key: 'minmax', width: 90,
      render: (_, r) => <span className={styles.minmax}>{r.minStock} / {r.maxStock}</span>,
    },
    {
      title: 'Unit Price', key: 'price', width: 100,
      render: (_, r) => <span className={styles.price}>₹{parseFloat(r.sellPrice).toLocaleString('en-IN')}</span>,
    },
    {
      title: 'Location', key: 'loc', width: 100,
      render: (_, r) => <span className={styles.loc}>{r.warehouseZone}-{r.binLocation || '?'}</span>,
    },
    {
      title: 'Status', dataIndex: 'isActive', width: 80,
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Active' : 'Inactive'}</Tag>,
    },
    {
      title: 'Actions', key: 'actions', width: 100, fixed: 'right',
      render: (_, r) => (
        <Space>
          <Tooltip title="Adjust Stock"><Button size="small" icon={<SwapOutlined />} onClick={() => setAdjustProduct(r)} /></Tooltip>
          {r.isActive && (
            <Popconfirm title="Deactivate product?" onConfirm={() => deactivate(r.id)}>
              <Tooltip title="Deactivate"><Button size="small" danger icon={<StopOutlined />} /></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (initializing || !user) return null;

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>
        <TopBar title="Products" />
        <div className={styles.content}>
          <div className={styles.header}>
            <div>
              <div className={styles.pageTitle}>📦 Product Catalog</div>
              <div className={styles.pageSub}>{rows.length} products found</div>
            </div>
            <Button type="primary" icon={<PlusOutlined />} className={styles.addBtn} onClick={() => setAddOpen(true)}>Add Product</Button>
          </div>

          {/* Category pills */}
          <div className={styles.pills}>
            <button className={`${styles.pill} ${category === '' ? styles.pillActive : ''}`} onClick={() => setCategory('')}>All Categories</button>
            {CATS.map(c => (
              <button key={c} className={`${styles.pill} ${category === c ? styles.pillActive : ''}`} onClick={() => setCategory(category === c ? '' : c)}>
                {c.replace(/-/g,' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>

          {/* Stock filter + search */}
          <div className={styles.filterBar}>
            <div className={styles.stockFilters}>
              {STOCK_FILTERS.map(f => (
                <button key={f.value} className={`${styles.stockChip} ${stockFilter === f.value ? styles.stockChipActive : ''}`}
                  style={stockFilter === f.value ? { borderColor: f.color, color: f.color, background: `${f.color}10` } : {}}
                  onClick={() => setStockFilter(stockFilter === f.value ? '' : f.value)}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className={styles.searchWrap}>
              <Input prefix={<SearchOutlined />} placeholder="Search by name or SKU" value={search} onChange={e => setSearch(e.target.value)} allowClear className={styles.search} />
              <Button icon={<ReloadOutlined />} onClick={load} loading={loading} />
            </div>
          </div>

          <div className={styles.tableWrap}>
            <Table columns={columns} dataSource={rows} rowKey="id" loading={loading} scroll={{ x: 1100 }}
              rowClassName={r => !r.isActive ? styles.inactiveRow : ''}
              pagination={{ pageSize: 12, showTotal: t => `${t} products`, showSizeChanger: false }} />
          </div>
        </div>
      </main>

      <AddProductModal open={addOpen} warehouse={selectedWarehouse} onClose={() => setAddOpen(false)} onSuccess={() => { setAddOpen(false); load(); }} />
      <StockAdjustModal product={adjustProduct} warehouse={selectedWarehouse} open={!!adjustProduct} onClose={() => setAdjustProduct(null)} onSuccess={() => { setAdjustProduct(null); load(); }} />
    </div>
  );
}

import { Suspense } from 'react';
export default function ProductsPageWrapper() {
  return <Suspense><ProductsPage /></Suspense>;
}
