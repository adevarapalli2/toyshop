'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select } from 'antd';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart } from 'recharts';
import { RootState } from '@/store/index';
import { shipmentService, ShipmentAnalytics, ShipmentRow, STATUS_META, CARRIER_META, ShipStatus } from '@/services/shipmentService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import ShipmentStatusBadge from '@/components/shipments/ShipmentStatusBadge';
import CarrierBadge from '@/components/shipments/CarrierBadge';
import styles from './page.module.css';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CY=new Date().getFullYear();
const YEARS=Array.from({length:4},(_,i)=>CY-i);
type RelKey='today'|'7d'|'30d'|'90d'|'month'|'year'|'custom';
const RELS:[RelKey,string][]=[['today','Today'],['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['month','This Month'],['year','This Year']];
function buildRange(rel:RelKey,mo:number,yr:number){
  const now=new Date(),p=(n:number)=>String(n).padStart(2,'0'),f=(d:Date)=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  if(rel==='today'){const t=f(now);return{from:t,to:t};}
  if(rel==='7d'){const d=new Date(now);d.setDate(d.getDate()-6);return{from:f(d),to:f(now)};}
  if(rel==='30d'){const d=new Date(now);d.setDate(d.getDate()-29);return{from:f(d),to:f(now)};}
  if(rel==='90d'){const d=new Date(now);d.setDate(d.getDate()-89);return{from:f(d),to:f(now)};}
  if(rel==='month'){return{from:`${now.getFullYear()}-${p(now.getMonth()+1)}-01`,to:f(now)};}
  if(rel==='year'){return{from:`${now.getFullYear()}-01-01`,to:f(now)};}
  const last=new Date(yr,mo,0).getDate();return{from:`${yr}-${p(mo)}-01`,to:`${yr}-${p(mo)}-${last}`};
}
const timeSince=(d:string)=>{const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};
const daysLeft=(d:string|null)=>{if(!d)return null;const diff=Math.ceil((new Date(d).getTime()-Date.now())/86400000);return diff;};

export default function ShipmentsDashboard() {
  const router=useRouter();
  const {user,initializing}=useSelector((s:RootState)=>s.auth);
  const selectedWarehouse=useSelector((s:RootState)=>s.warehouse.selected);
  const [analytics,setAnalytics]=useState<ShipmentAnalytics|null>(null);
  const [recent,setRecent]=useState<ShipmentRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [rel,setRel]=useState<RelKey>('90d');
  const [selMo,setSelMo]=useState(new Date().getMonth()+1);
  const [selYr,setSelYr]=useState(CY);

  useEffect(()=>{if(!initializing&&!user)router.replace('/login');},[user,initializing,router]);

  const load=useCallback(async()=>{
    if(!user)return;
    const {from,to}=buildRange(rel,selMo,selYr);
    setLoading(true);
    const [aRes,lRes]=await Promise.allSettled([
      shipmentService.analytics({from,to,warehouse:selectedWarehouse}),
      shipmentService.list({from,to,warehouse:selectedWarehouse}),
    ]);
    if(aRes.status==='fulfilled')setAnalytics(aRes.value.data as unknown as ShipmentAnalytics);
    if(lRes.status==='fulfilled')setRecent((lRes.value.data.data??[]).slice(0,10));
    setLoading(false);
  },[user,rel,selMo,selYr,selectedWarehouse]);

  useEffect(()=>{load();},[load]);
  if(initializing||!user)return null;
  const k=analytics?.kpi;
  const {from,to}=buildRange(rel,selMo,selYr);
  const relLabel=rel==='custom'?`${MONTHS[selMo-1]} ${selYr}`:RELS.find(r=>r[0]===rel)?.[1]??'';

  const kpiCards=k?[
    {label:'Total Shipments',   value:k.total,         icon:'🚚',color:'#1d4ed8',bg:'linear-gradient(135deg,#1d4ed8,#0ea5e9)',href:'/shipments/list'},
    {label:'In Transit',        value:k.inTransit,     icon:'✈️',color:'#6366f1',bg:'linear-gradient(135deg,#6366f1,#818cf8)',href:'/shipments/list?status=in_transit'},
    {label:'Out for Delivery',  value:analytics?.statusDistribution?.find(s=>s.status==='out_for_delivery')?.count??0,icon:'🚐',color:'#d97706',bg:'linear-gradient(135deg,#d97706,#fbbf24)',href:'/shipments/list?status=out_for_delivery'},
    {label:'Delivered Today',   value:k.deliveredToday,icon:'✅',color:'#059669',bg:'linear-gradient(135deg,#059669,#34d399)',href:'/shipments/list?status=delivered'},
    {label:'Failed/Delayed',    value:k.failed,        icon:'⚠️',color:'#dc2626',bg:'linear-gradient(135deg,#dc2626,#f87171)',href:'/shipments/list?status=failed_delivery'},
    {label:'On-Time Rate',      value:`${k.onTimeRate}%`,icon:'📊',color:'#7c3aed',bg:'linear-gradient(135deg,#7c3aed,#a78bfa)',href:'/shipments/list'},
  ]:[];

  return (
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title="Shipments"/>
        <div className={styles.content}>

          {/* Filter bar */}
          <div className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <span className={styles.filterLabel}>📅 Period:</span>
              <div className={styles.relChips}>
                {RELS.map(([key,label])=>(
                  <button key={key} className={`${styles.relChip} ${rel===key&&rel!=='custom'?styles.relChipActive:''}`} onClick={()=>setRel(key as RelKey)}>{label}</button>
                ))}
              </div>
            </div>
            <div className={styles.filterRight}>
              <Select value={selMo} onChange={v=>{setSelMo(v);setRel('custom');}} className={styles.filterSelect} options={MONTHS.map((m,i)=>({value:i+1,label:m}))}/>
              <Select value={selYr} onChange={v=>{setSelYr(v);setRel('custom');}} className={styles.filterSelect} options={YEARS.map(y=>({value:y,label:String(y)}))}/>
              <span className={styles.dateRange}>{from} → {to}</span>
            </div>
          </div>

          {/* KPI cards */}
          <div className={styles.kpiRow}>
            {kpiCards.map(c=>(
              <button key={c.label} className={styles.kpiCard} onClick={()=>router.push(c.href)}>
                <div className={styles.kpiIcon} style={{background:c.bg}}>{c.icon}</div>
                <div>
                  <div className={styles.kpiValue} style={{color:c.color}}>{loading?'—':c.value}</div>
                  <div className={styles.kpiLabel}>{c.label}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Strip */}
          {k&&(
            <div className={styles.strip}>
              <span className={styles.stripTitle}>🚀 {relLabel}:</span>
              <span className={styles.stripStat}><b>{k.avgDeliveryDays}</b> Avg Delivery Days</span>
              <span className={styles.stripDot}>·</span>
              <span className={styles.stripStat}><b>₹{k.totalShippingCost.toLocaleString('en-IN')}</b> Total Shipping Cost</span>
              <span className={styles.stripDot}>·</span>
              <span className={styles.stripStat}><b>{k.failed}</b> Failed Deliveries</span>
              <button className={styles.stripBtn} onClick={()=>router.push('/shipments/list')}>View All →</button>
            </div>
          )}

          {/* Charts */}
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <div className={styles.chartTitle}>📈 Delivery Trend</div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={analytics?.deliveryTrend??[]} margin={{left:0,right:16}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                  <YAxis tick={{fontSize:10}}/>
                  <Tooltip/>
                  <Legend/>
                  <Bar dataKey="shipped" name="Shipped" fill="#c7d2fe" radius={[4,4,0,0]}/>
                  <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#059669" strokeWidth={2.5} dot={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.carrierCard}>
              <div className={styles.chartTitle}>🏭 Carrier Performance</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics?.carrierBreakdown??[]} layout="vertical" margin={{left:8,right:32}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                  <XAxis type="number" tick={{fontSize:10}}/>
                  <YAxis type="category" dataKey="carrier" tick={{fontSize:11}} width={65}/>
                  <Tooltip/>
                  <Bar dataKey="count" name="Total" fill="#6366f1" radius={[0,4,4,0]}/>
                  <Bar dataKey="delivered" name="Delivered" fill="#10b981" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent shipments */}
          <div className={styles.recentCard}>
            <div className={styles.recentHeader}>
              <div className={styles.chartTitle}>🚚 Recent Shipments</div>
              <button className={styles.viewAll} onClick={()=>router.push('/shipments/list')}>View all →</button>
            </div>
            <div className={styles.recentTable}>
              <div className={styles.thead}><span>Shipment</span><span>Tracking</span><span>Customer</span><span>Carrier</span><span>Status</span><span>Est. Delivery</span><span>When</span></div>
              {recent.map(s=>{
                const dl=daysLeft(s.estimatedDelivery);
                const overdue=dl!==null&&dl<0&&s.status!=='delivered';
                return(
                  <div key={s.id} className={`${styles.trow} ${overdue?styles.overdue:''}`} onClick={()=>router.push(`/shipments/${s.id}`)}>
                    <span className={styles.shipNum}>{s.shipmentNumber}</span>
                    <span className={styles.trackNum}>{s.trackingNumber||'—'}</span>
                    <span className={styles.custName}>{s.customerName||'—'}<span className={styles.custCity}> · {s.customerCity||''}</span></span>
                    <CarrierBadge carrier={s.carrier}/>
                    <ShipmentStatusBadge status={s.status as ShipStatus}/>
                    <span className={overdue?styles.overdueDate:styles.estDate}>
                      {s.estimatedDelivery?new Date(s.estimatedDelivery).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}):'—'}
                      {dl!==null&&s.status!=='delivered'&&<span className={overdue?styles.overdueDl:styles.dlLeft}> ({overdue?`${Math.abs(dl)}d late`:`${dl}d left`})</span>}
                    </span>
                    <span className={styles.when}>{timeSince(s.createdAt)}</span>
                  </div>
                );
              })}
              {!recent.length&&!loading&&<div className={styles.empty}>No shipments in this period</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
