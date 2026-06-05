'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select, Tag } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { RootState } from '@/store/index';
import { orderService, OrderAnalytics, OrderRow, STATUS_META, PRIORITY_META, OrderStatus, Priority } from '@/services/orderService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import PriorityBadge from '@/components/orders/PriorityBadge';
import styles from './page.module.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 4 }, (_, i) => currentYear - i);
type RelKey = 'today'|'7d'|'30d'|'90d'|'month'|'year'|'custom';
const RELS: {key:RelKey;label:string}[] = [
  {key:'today',label:'Today'},{key:'7d',label:'7 Days'},{key:'30d',label:'30 Days'},
  {key:'90d',label:'90 Days'},{key:'month',label:'This Month'},{key:'year',label:'This Year'},
];
function buildRange(rel:RelKey, month:number, year:number) {
  const now=new Date(), pad=(n:number)=>String(n).padStart(2,'0'), fmt=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if(rel==='today'){const t=fmt(now);return{from:t,to:t};}
  if(rel==='7d'){const f=new Date(now);f.setDate(f.getDate()-6);return{from:fmt(f),to:fmt(now)};}
  if(rel==='30d'){const f=new Date(now);f.setDate(f.getDate()-29);return{from:fmt(f),to:fmt(now)};}
  if(rel==='90d'){const f=new Date(now);f.setDate(f.getDate()-89);return{from:fmt(f),to:fmt(now)};}
  if(rel==='month'){return{from:`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`,to:fmt(now)};}
  if(rel==='year'){return{from:`${now.getFullYear()}-01-01`,to:fmt(now)};}
  const last=new Date(year,month,0).getDate();
  return{from:`${year}-${pad(month)}-01`,to:`${year}-${pad(month)}-${last}`};
}

const PIE_COLORS = ['#64748b','#1d4ed8','#d97706','#7c3aed','#0891b2','#059669','#dc2626','#9333ea'];
const timeSince=(d:string)=>{const s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};

export default function OrdersDashboard() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const [analytics, setAnalytics] = useState<OrderAnalytics|null>(null);
  const [recent, setRecent] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rel, setRel] = useState<RelKey>('30d');
  const [selMonth, setSelMonth] = useState(new Date().getMonth()+1);
  const [selYear, setSelYear] = useState(currentYear);
  const [trendView, setTrendView] = useState<'day'|'week'|'month'>('day');

  useEffect(()=>{ if(!initializing&&!user)router.replace('/login'); },[user,initializing,router]);

  const load = useCallback(async()=>{
    if(!user)return;
    const {from,to}=buildRange(rel,selMonth,selYear);
    setLoading(true);
    const [aRes,oRes] = await Promise.all([
      orderService.analytics({from,to}),
      orderService.list({from,to,page:1}),
    ]);
    setAnalytics(aRes.data as unknown as OrderAnalytics);
    setRecent((oRes.data.data??[]).slice(0,10));
    setLoading(false);
  },[user,rel,selMonth,selYear]);

  useEffect(()=>{ load(); },[load]);

  if(initializing||!user)return null;
  const k=analytics?.kpi;
  const {from,to}=buildRange(rel,selMonth,selYear);
  const relLabel=rel==='custom'?`${MONTHS[selMonth-1]} ${selYear}`:RELS.find(r=>r.key===rel)?.label??'';

  const kpiCards = k ? [
    {label:'Total Orders',   value:k.total,   icon:'🛒',color:'#1d4ed8',bg:'linear-gradient(135deg,#1d4ed8,#0ea5e9)', href:`/orders/list`},
    {label:'Pending',        value:k.pending, icon:'⏳',color:'#64748b',bg:'linear-gradient(135deg,#64748b,#94a3b8)', href:`/orders/list?status=pending`},
    {label:'In Progress',    value:k.inProgress,icon:'⚡',color:'#d97706',bg:'linear-gradient(135deg,#d97706,#fbbf24)', href:`/orders/list?status=in_progress`},
    {label:'Shipped',        value:k.shipped, icon:'🚚',color:'#0891b2',bg:'linear-gradient(135deg,#0891b2,#22d3ee)', href:`/orders/list?status=shipped`},
    {label:'Delivered',      value:k.delivered,icon:'✅',color:'#059669',bg:'linear-gradient(135deg,#059669,#34d399)', href:`/orders/list?status=delivered`},
    {label:'Revenue',        value:`₹${(k.revenue||0).toLocaleString('en-IN')}`,icon:'💰',color:'#7c3aed',bg:'linear-gradient(135deg,#7c3aed,#a78bfa)', href:`/orders/analytics`},
  ] : [];

  // Aggregate trend by week/month if needed
  const trendData = analytics?.revenueTrend ?? [];

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>
        <TopBar title="Orders" />
        <div className={styles.content}>

          {/* Filter bar */}
          <div className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <span className={styles.filterLabel}>📅 Period:</span>
              <div className={styles.relChips}>
                {RELS.map(r=>(
                  <button key={r.key} className={`${styles.relChip} ${rel===r.key&&rel!=='custom'?styles.relChipActive:''}`} onClick={()=>setRel(r.key)}>{r.label}</button>
                ))}
              </div>
            </div>
            <div className={styles.filterRight}>
              <Select value={selMonth} onChange={v=>{setSelMonth(v);setRel('custom');}} className={styles.filterSelect} options={MONTHS.map((m,i)=>({value:i+1,label:m}))} />
              <Select value={selYear} onChange={v=>{setSelYear(v);setRel('custom');}} className={styles.filterSelect} options={YEARS.map(y=>({value:y,label:String(y)}))} />
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

          {/* Period strip */}
          {k && (
            <div className={styles.strip}>
              <span className={styles.stripTitle}>📊 {relLabel}:</span>
              <span className={styles.stripStat}><b>{k.fulfillmentRate}%</b> Fulfillment</span>
              <span className={styles.stripDot}>·</span>
              <span className={styles.stripStat}><b>₹{(k.avgOrderValue||0).toLocaleString('en-IN')}</b> Avg Order</span>
              <span className={styles.stripDot}>·</span>
              <span className={styles.stripStat}><b>{k.cancellationRate}%</b> Cancellation Rate</span>
              <button className={styles.stripBtn} onClick={()=>router.push('/orders/analytics')}>Deep Analytics →</button>
            </div>
          )}

          {/* Charts row */}
          <div className={styles.chartsRow}>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div className={styles.chartTitle}>📈 Revenue Trend</div>
                <div className={styles.trendToggle}>
                  {(['day','week','month'] as const).map(v=>(
                    <button key={v} className={`${styles.toggleBtn} ${trendView===v?styles.toggleActive:''}`} onClick={()=>setTrendView(v)}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendData} margin={{left:0,right:16}}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                  <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${v}`}/>
                  <Tooltip formatter={(v:unknown)=>[`₹${Number(v).toLocaleString('en-IN')}`,'']} labelStyle={{fontSize:12}}/>
                  <Area type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2} fill="url(#revGrad)" name="Revenue"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.pieCard}>
              <div className={styles.chartTitle}>🍩 Order Status</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={analytics?.statusDistribution??[]} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={3}>
                    {(analytics?.statusDistribution??[]).map((entry,i)=>(
                      <Cell key={entry.status} fill={STATUS_META[entry.status as OrderStatus]?.color??PIE_COLORS[i%PIE_COLORS.length]}/>
                    ))}
                  </Pie>
                  <Tooltip/>
                  <Legend iconType="circle" iconSize={8} formatter={(v)=>STATUS_META[v as OrderStatus]?.label??v}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent orders */}
          <div className={styles.recentCard}>
            <div className={styles.recentHeader}>
              <div className={styles.chartTitle}>🛒 Recent Orders</div>
              <button className={styles.viewAll} onClick={()=>router.push('/orders/list')}>View all →</button>
            </div>
            <div className={styles.recentTable}>
              <div className={styles.recentThead}>
                <span>Order #</span><span>Customer</span><span>Items</span><span>Total</span><span>Status</span><span>Priority</span><span>When</span>
              </div>
              {recent.map(o=>(
                <div key={o.id} className={styles.recentRow} onClick={()=>router.push(`/orders/${o.id}`)}>
                  <span className={styles.orderNum}>{o.orderNumber}</span>
                  <span className={styles.custName}>{o.customerName||'Walk-in'}<span className={styles.custCity}> · {o.customerCity||''}</span></span>
                  <span className={styles.itemCnt}>{o.itemCount} item{o.itemCount!==1?'s':''}</span>
                  <span className={styles.total}>₹{parseFloat(o.totalAmount).toLocaleString('en-IN')}</span>
                  <span><OrderStatusBadge status={o.status}/></span>
                  <span><PriorityBadge priority={o.priority}/></span>
                  <span className={styles.when}>{timeSince(o.createdAt)}</span>
                </div>
              ))}
              {recent.length===0&&!loading&&<div className={styles.empty}>No orders in this period</div>}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
