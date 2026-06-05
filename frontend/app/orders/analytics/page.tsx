'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select } from 'antd';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, PieChart, Pie, Cell,
} from 'recharts';
import { RootState } from '@/store/index';
import { orderService, OrderAnalytics, STATUS_META, OrderStatus } from '@/services/orderService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import styles from './page.module.css';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({length:4},(_,i)=>currentYear-i);
type RelKey='today'|'7d'|'30d'|'90d'|'month'|'year'|'custom';
const RELS: {key:RelKey;label:string}[]=[{key:'7d',label:'7 Days'},{key:'30d',label:'30 Days'},{key:'90d',label:'90 Days'},{key:'month',label:'This Month'},{key:'year',label:'This Year'}];

function buildRange(rel:RelKey,month:number,year:number){
  const now=new Date(),pad=(n:number)=>String(n).padStart(2,'0'),fmt=(d:Date)=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  if(rel==='7d'){const f=new Date(now);f.setDate(f.getDate()-6);return{from:fmt(f),to:fmt(now)};}
  if(rel==='30d'){const f=new Date(now);f.setDate(f.getDate()-29);return{from:fmt(f),to:fmt(now)};}
  if(rel==='90d'){const f=new Date(now);f.setDate(f.getDate()-89);return{from:fmt(f),to:fmt(now)};}
  if(rel==='month'){return{from:`${now.getFullYear()}-${pad(now.getMonth()+1)}-01`,to:fmt(now)};}
  if(rel==='year'){return{from:`${now.getFullYear()}-01-01`,to:fmt(now)};}
  const last=new Date(year,month,0).getDate();return{from:`${year}-${pad(month)}-01`,to:`${year}-${pad(month)}-${last}`};
}

const catLabel=(c:string)=>c.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
const PIE_COLORS=['#1d4ed8','#d97706','#7c3aed','#0891b2','#059669','#dc2626','#64748b','#9333ea','#ea580c','#0f766e'];

export default function OrderAnalyticsPage() {
  const router=useRouter();
  const {user,initializing}=useSelector((s:RootState)=>s.auth);
  const [data,setData]=useState<OrderAnalytics|null>(null);
  const [rel,setRel]=useState<RelKey>('90d');
  const [selMonth,setSelMonth]=useState(new Date().getMonth()+1);
  const [selYear,setSelYear]=useState(currentYear);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{if(!initializing&&!user)router.replace('/login');},[user,initializing,router]);

  const load=useCallback(async()=>{
    if(!user)return;
    const {from,to}=buildRange(rel,selMonth,selYear);
    setLoading(true);
    const r=await orderService.analytics({from,to});
    setData(r.data as unknown as OrderAnalytics);
    setLoading(false);
  },[user,rel,selMonth,selYear]);

  useEffect(()=>{load();},[load]);
  if(initializing||!user)return null;
  const k=data?.kpi;
  const revenueChange=k&&k.prevRevenue>0?((k.revenue-k.prevRevenue)/k.prevRevenue*100).toFixed(1):'—';
  const {from,to}=buildRange(rel,selMonth,selYear);

  return (
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title="Order Analytics"/>
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div className={styles.pageTitle}>📊 Order Analytics & Patterns</div>
            <div className={styles.pageSub}>Deep insights into your order performance and trends</div>
          </div>

          {/* Filter */}
          <div className={styles.filterBar}>
            <span className={styles.filterLabel}>📅 Period:</span>
            <div className={styles.relChips}>{RELS.map(r=><button key={r.key} className={`${styles.relChip} ${rel===r.key&&rel!=='custom'?styles.relChipActive:''}`} onClick={()=>setRel(r.key)}>{r.label}</button>)}</div>
            <Select value={selMonth} onChange={v=>{setSelMonth(v);setRel('custom');}} className={styles.filterSelect} options={MONTHS.map((m,i)=>({value:i+1,label:m}))}/>
            <Select value={selYear} onChange={v=>{setSelYear(v);setRel('custom');}} className={styles.filterSelect} options={YEARS.map(y=>({value:y,label:String(y)}))}/>
            <span className={styles.dateRange}>{from} → {to}</span>
          </div>

          {/* KPI cards row */}
          <div className={styles.kpiRow}>
            {[
              {label:'Total Revenue',value:`₹${(k?.revenue||0).toLocaleString('en-IN')}`,sub:k&&k.prevRevenue>0?`${Number(revenueChange)>0?'+':''}${revenueChange}% vs prev`:undefined,color:'#1d4ed8',icon:'💰'},
              {label:'Orders Fulfilled',value:`${k?.delivered||0}`,sub:`${k?.fulfillmentRate||0}% fulfillment rate`,color:'#059669',icon:'✅'},
              {label:'Avg Order Value',value:`₹${(k?.avgOrderValue||0).toLocaleString('en-IN')}`,sub:`from ${k?.total||0} orders`,color:'#7c3aed',icon:'📈'},
              {label:'Cancellation Rate',value:`${k?.cancellationRate||0}%`,sub:`${k?.cancelled||0} cancelled orders`,color:k&&k.cancellationRate>10?'#dc2626':'#d97706',icon:'❌'},
            ].map(c=>(
              <div key={c.label} className={styles.kpiCard}>
                <div className={styles.kpiTop}><span className={styles.kpiIcon}>{c.icon}</span><span className={styles.kpiValue} style={{color:c.color}}>{loading?'—':c.value}</span></div>
                <div className={styles.kpiLabel}>{c.label}</div>
                {c.sub&&<div className={styles.kpiSub}>{c.sub}</div>}
              </div>
            ))}
          </div>

          {/* Revenue & Volume trend — full width */}
          <div className={styles.fullCard}>
            <div className={styles.cardTitle}>📈 Revenue & Order Volume Trend</div>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data?.revenueTrend??[]} margin={{left:0,right:24}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                <YAxis yAxisId="rev" tick={{fontSize:10}} tickFormatter={v=>`₹${v}`}/>
                <YAxis yAxisId="ord" orientation="right" tick={{fontSize:10}}/>
                <Tooltip labelStyle={{fontSize:12}}/>
                <Legend/>
                <Bar yAxisId="ord" dataKey="orders" name="Orders" fill="#e0e7ff" radius={[4,4,0,0]}/>
                <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue" stroke="#1d4ed8" strokeWidth={2.5} dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Row 3 — 3 cols */}
          <div className={styles.row3}>
            {/* Top products */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>🏆 Top Products by Revenue</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.topProducts??[]} layout="vertical" margin={{left:4,right:24}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                  <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`₹${v}`}/>
                  <YAxis type="category" dataKey="sku" tick={{fontSize:10}} width={60}/>
                  <Tooltip formatter={(v:unknown)=>[`₹${Number(v).toLocaleString('en-IN')}`,'Revenue']}/>
                  <Bar dataKey="revenue" fill="#1d4ed8" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Day of week */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>📅 Orders by Day of Week</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.ordersByDayOfWeek??[]} margin={{left:0,right:8}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="day" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:10}}/>
                  <Tooltip/>
                  <Bar dataKey="count" name="Orders" fill="#6366f1" radius={[4,4,0,0]}>
                    {(data?.ordersByDayOfWeek??[]).map((entry,i)=>(
                      <Cell key={i} fill={entry.count===Math.max(...(data?.ordersByDayOfWeek??[]).map(d=>d.count))?'#1d4ed8':'#c7d2fe'}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category revenue */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>🏷️ Revenue by Category</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data?.categoryRevenue??[]} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} innerRadius={35} paddingAngle={2}>
                    {(data?.categoryRevenue??[]).map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v:unknown,n:unknown)=>[`₹${Number(v).toLocaleString('en-IN')}`,catLabel(String(n))]}/>
                  <Legend iconType="circle" iconSize={8} formatter={catLabel}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 4 — funnel + priority */}
          <div className={styles.row4}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>🔽 Order Status Funnel</div>
              <div className={styles.funnel}>
                {(data?.statusFunnel??[]).map((f,i,arr)=>{
                  const maxCount=arr[0]?.count||1;
                  const pct=Math.round((f.count/maxCount)*100);
                  const meta=STATUS_META[f.status as OrderStatus];
                  return(
                    <div key={f.status} className={styles.funnelRow}>
                      <div className={styles.funnelLabel}>{meta?.icon} {meta?.label}</div>
                      <div className={styles.funnelBar}>
                        <div className={styles.funnelFill} style={{width:`${pct}%`,background:meta?.color}}/>
                      </div>
                      <div className={styles.funnelCount} style={{color:meta?.color}}>{f.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>⚡ Priority Breakdown</div>
              <div className={styles.priorityTable}>
                <div className={styles.ptHead}><span>Priority</span><span>Orders</span><span>Revenue</span><span>Share</span></div>
                {['urgent','high','normal'].map(p=>{
                  const matches=(data?.statusDistribution??[]);
                  const pOrders=(data?.revenueTrend??[]).length; // placeholder
                  const total=k?.total||1;
                  const byP=data?.statusDistribution?.find(s=>s.status===p);
                  return(
                    <div key={p} className={styles.ptRow}>
                      <span className={styles.ptPriority} style={{color:p==='urgent'?'#dc2626':p==='high'?'#d97706':'#059669'}}>
                        {p==='urgent'?'🔴':p==='high'?'🟠':'🟢'} {p.charAt(0).toUpperCase()+p.slice(1)}
                      </span>
                      <span>—</span><span>—</span><span>—</span>
                    </div>
                  );
                })}
                {/* Real status distribution table */}
                <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid #f1f5f9'}}>
                  <div className={styles.ptHead}><span>Status</span><span>Count</span><span>Value</span><span>%</span></div>
                  {(data?.statusDistribution??[]).map(s=>(
                    <div key={s.status} className={styles.ptRow}>
                      <span style={{color:STATUS_META[s.status as OrderStatus]?.color,fontWeight:600}}>{STATUS_META[s.status as OrderStatus]?.icon} {STATUS_META[s.status as OrderStatus]?.label}</span>
                      <span>{s.count}</span>
                      <span>₹{Number(s.value).toLocaleString('en-IN')}</span>
                      <span>{k?.total?Math.round(s.count/k.total*100):0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
