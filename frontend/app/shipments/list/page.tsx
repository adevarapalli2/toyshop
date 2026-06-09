'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Table, Input, Button, Space, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { EyeOutlined, PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { shipmentService, ShipmentRow, ShipStatus, CARRIERS, STATUSES, STATUS_META } from '@/services/shipmentService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import ShipmentStatusBadge from '@/components/shipments/ShipmentStatusBadge';
import CarrierBadge from '@/components/shipments/CarrierBadge';
import styles from './page.module.css';

function daysLeft(d:string|null){if(!d)return null;return Math.ceil((new Date(d).getTime()-Date.now())/86400000);}

function ShipmentsList() {
  const router=useRouter();
  const params=useSearchParams();
  const {user,initializing}=useSelector((s:RootState)=>s.auth);
  const selectedWarehouse=useSelector((s:RootState)=>s.warehouse.selected);
  const [rows,setRows]=useState<ShipmentRow[]>([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState('');
  const [statusFilter,setStatusFilter]=useState(params.get('status')??'');
  const [carrierFilter,setCarrierFilter]=useState('');

  useEffect(()=>{if(!initializing&&!user)router.replace('/login');},[user,initializing,router]);

  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await shipmentService.list({status:statusFilter||undefined,carrier:carrierFilter||undefined,search:search||undefined,warehouse:selectedWarehouse});
      setRows(r.data.data??[]);
    }catch{message.error('Failed to load shipments');}
    finally{setLoading(false);}
  },[search,statusFilter,carrierFilter,selectedWarehouse]);

  useEffect(()=>{if(user)load();},[load,user]);

  const columns:ColumnsType<ShipmentRow>=[
    {title:'Shipment #',dataIndex:'shipmentNumber',width:120,render:(v:string,r:ShipmentRow)=><button className={styles.shipLink} onClick={()=>router.push(`/shipments/${r.id}`)}>{v}</button>},
    {title:'Tracking #',dataIndex:'trackingNumber',width:120,render:(v:string)=><span className={styles.trackNum}>{v||'—'}</span>},
    {title:'Order',dataIndex:'orderNumber',width:110,render:(v:string,r:ShipmentRow)=><button className={styles.orderLink} onClick={e=>{e.stopPropagation();router.push(`/orders/${r.orderId}`);}}>{v}</button>},
    {title:'Customer',key:'cust',width:150,render:(_,r)=><div><div className={styles.custName}>{r.customerName||'—'}</div><div className={styles.custCity}>{r.customerCity}</div></div>},
    {title:'Carrier',dataIndex:'carrier',width:100,render:(v:string)=><CarrierBadge carrier={v}/>},
    {title:'Service',dataIndex:'serviceType',width:90,render:(v:string)=><span className={styles.svc}>{v}</span>},
    {title:'Status',dataIndex:'status',width:150,render:(v:ShipStatus)=><ShipmentStatusBadge status={v}/>},
    {title:'Est. Delivery',dataIndex:'estimatedDelivery',width:120,render:(v:string,r:ShipmentRow)=>{
      const dl=daysLeft(v);const overdue=dl!==null&&dl<0&&r.status!=='delivered';
      return<div><div className={overdue?styles.overdueDate:styles.estDate}>{v?new Date(v).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}):'—'}</div>
      {dl!==null&&r.status!=='delivered'&&<div className={overdue?styles.overdueDl:styles.dlLeft}>{overdue?`${Math.abs(dl)}d late`:`${dl}d left`}</div>}</div>;
    }},
    {title:'Actions',key:'a',width:70,fixed:'right',render:(_,r)=><Space><Tooltip title="View"><Button size="small" icon={<EyeOutlined/>} onClick={()=>router.push(`/shipments/${r.id}`)}/></Tooltip></Space>},
  ];

  if(initializing||!user)return null;
  return(
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title="Shipments"/>
        <div className={styles.content}>
          <div className={styles.header}>
            <div><div className={styles.pageTitle}>🚚 All Shipments</div><div className={styles.pageSub}>{rows.length} shipments</div></div>
            <Button type="primary" icon={<PlusOutlined/>} className={styles.addBtn} onClick={()=>router.push('/shipments/new')}>New Shipment</Button>
          </div>

          {/* Status chips */}
          <div className={styles.chips}>
            <button className={`${styles.chip} ${!statusFilter?styles.chipActive:''}`} onClick={()=>setStatusFilter('')}>All</button>
            {STATUSES.map(s=>{
              const m=STATUS_META[s];
              return<button key={s} className={`${styles.chip} ${statusFilter===s?styles.chipActive:''}`}
                style={statusFilter===s?{background:`${m.color}15`,borderColor:m.color,color:m.color}:{}}
                onClick={()=>setStatusFilter(statusFilter===s?'':s)}>{m.icon} {m.label}</button>;
            })}
          </div>

          {/* Carrier + search */}
          <div className={styles.filterRow}>
            <div className={styles.carrierChips}>
              <button className={`${styles.cChip} ${!carrierFilter?styles.cChipActive:''}`} onClick={()=>setCarrierFilter('')}>All Carriers</button>
              {CARRIERS.map(c=><button key={c} className={`${styles.cChip} ${carrierFilter===c?styles.cChipActive:''}`} onClick={()=>setCarrierFilter(carrierFilter===c?'':c)}>{c}</button>)}
            </div>
            <div className={styles.searchWrap}>
              <Input prefix={<SearchOutlined/>} placeholder="Search tracking # or customer" value={search} onChange={e=>setSearch(e.target.value)} allowClear className={styles.search}/>
              <Button icon={<ReloadOutlined/>} onClick={load} loading={loading}/>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <Table columns={columns} dataSource={rows} rowKey="id" loading={loading} scroll={{x:1000}}
              rowClassName={r=>{const dl=daysLeft(r.estimatedDelivery);return dl!==null&&dl<0&&r.status!=='delivered'?styles.overdueRow:'';}}
              pagination={{pageSize:15,showTotal:t=>`${t} shipments`,showSizeChanger:false}}
              onRow={r=>({onClick:()=>router.push(`/shipments/${r.id}`),style:{cursor:'pointer'}})}/>
          </div>
        </div>
      </main>
    </div>
  );
}
export default function ShipmentsListWrapper(){return<Suspense><ShipmentsList/></Suspense>;}
