'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Table, Input, Button, Space, Popconfirm, message, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { SearchOutlined, EyeOutlined, StopOutlined, ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { orderService, OrderRow, OrderStatus, Priority, STATUS_META, PRIORITY_META } from '@/services/orderService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import PriorityBadge from '@/components/orders/PriorityBadge';
import styles from './page.module.css';

const STATUSES: {value:string;label:string}[] = [
  {value:'',label:'All'},{value:'pending',label:'Pending'},{value:'confirmed',label:'Confirmed'},
  {value:'picking',label:'Picking'},{value:'packed',label:'Packed'},{value:'shipped',label:'Shipped'},
  {value:'delivered',label:'Delivered'},{value:'cancelled',label:'Cancelled'},{value:'in_progress',label:'In Progress'},
];
const PRIORITIES = [{value:'',label:'All'},{value:'normal',label:'Normal'},{value:'high',label:'High'},{value:'urgent',label:'Urgent'}];
const timeSince=(d:string)=>{const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};

function OrdersList() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const selectedWarehouse = useSelector((s: RootState) => s.warehouse.selected);
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(params.get('status') ?? '');
  const [priorityFilter, setPriorityFilter] = useState(params.get('priority') ?? '');

  useEffect(()=>{ if(!initializing&&!user)router.replace('/login'); },[user,initializing,router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await orderService.list({ status:statusFilter||undefined, priority:priorityFilter||undefined, search:search||undefined, warehouse:selectedWarehouse });
      setRows(r.data.data ?? []);
    } catch { message.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [search, statusFilter, priorityFilter, selectedWarehouse]);

  useEffect(()=>{ if(user)load(); },[load,user]);

  const cancel = async(id:number) => {
    try { await orderService.cancel(id); message.success('Order cancelled'); load(); }
    catch(e:unknown){ const err=e as{response?:{data?:{message?:string}}};message.error(err.response?.data?.message||'Failed'); }
  };

  const columns: ColumnsType<OrderRow> = [
    { title:'Order #', dataIndex:'orderNumber', width:120,
      render:(v:string,r:OrderRow)=><button className={styles.orderLink} onClick={()=>router.push(`/orders/${r.id}`)}>{v}</button> },
    { title:'Customer', key:'cust', width:160,
      render:(_,r)=><div><div className={styles.custName}>{r.customerName||'Walk-in'}</div><div className={styles.custCity}>{r.customerCity}</div></div> },
    { title:'Items', dataIndex:'itemCount', width:60, render:(v:number)=><span className={styles.itemCnt}>{v}</span> },
    { title:'Total', dataIndex:'totalAmount', width:100, render:(v:string)=><span className={styles.total}>₹{parseFloat(v).toLocaleString('en-IN')}</span> },
    { title:'Status', dataIndex:'status', width:130, render:(v:OrderStatus)=><OrderStatusBadge status={v}/> },
    { title:'Priority', dataIndex:'priority', width:100, render:(v:Priority)=><PriorityBadge priority={v}/> },
    { title:'Assigned', dataIndex:'assignedToName', width:110, render:(v:string)=><span className={styles.assigned}>{v||'—'}</span> },
    { title:'Created', dataIndex:'createdAt', width:90, render:(v:string)=><span className={styles.when}>{timeSince(v)}</span> },
    { title:'Actions', key:'actions', width:90, fixed:'right',
      render:(_,r)=>(
        <Space>
          <Tooltip title="View"><Button size="small" icon={<EyeOutlined/>} onClick={()=>router.push(`/orders/${r.id}`)}/></Tooltip>
          {!['shipped','delivered','cancelled','returned'].includes(r.status) && (
            <Popconfirm title="Cancel this order?" onConfirm={()=>cancel(r.id)}>
              <Tooltip title="Cancel"><Button size="small" danger icon={<StopOutlined/>}/></Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if(initializing||!user)return null;

  return (
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title="Orders"/>
        <div className={styles.content}>
          <div className={styles.header}>
            <div>
              <div className={styles.pageTitle}>🛒 All Orders</div>
              <div className={styles.pageSub}>{rows.length} orders found</div>
            </div>
            <Button type="primary" icon={<PlusOutlined/>} className={styles.addBtn} onClick={()=>router.push('/orders/new')}>New Order</Button>
          </div>

          {/* Status chips */}
          <div className={styles.chips}>
            {STATUSES.map(s=>(
              <button key={s.value} className={`${styles.chip} ${statusFilter===s.value?styles.chipActive:''}`}
                style={statusFilter===s.value&&s.value?{background:`${STATUS_META[s.value as OrderStatus]?.color}15`,borderColor:STATUS_META[s.value as OrderStatus]?.color,color:STATUS_META[s.value as OrderStatus]?.color}:{}}
                onClick={()=>setStatusFilter(statusFilter===s.value?'':s.value)}>{s.label}
              </button>
            ))}
          </div>

          {/* Priority + search */}
          <div className={styles.filterRow}>
            <div className={styles.priorityChips}>
              {PRIORITIES.map(p=>(
                <button key={p.value} className={`${styles.pChip} ${priorityFilter===p.value?styles.pChipActive:''}`}
                  onClick={()=>setPriorityFilter(priorityFilter===p.value?'':p.value)}>{p.label}</button>
              ))}
            </div>
            <div className={styles.searchWrap}>
              <Input prefix={<SearchOutlined/>} placeholder="Search order# or customer" value={search} onChange={e=>setSearch(e.target.value)} allowClear className={styles.search}/>
              <Button icon={<ReloadOutlined/>} onClick={load} loading={loading}/>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <Table columns={columns} dataSource={rows} rowKey="id" loading={loading} scroll={{x:1000}}
              rowClassName={r=>r.status==='cancelled'?styles.cancelledRow:''}
              pagination={{pageSize:15,showTotal:t=>`${t} orders`,showSizeChanger:false}}/>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OrdersListWrapper(){ return <Suspense><OrdersList/></Suspense>; }
