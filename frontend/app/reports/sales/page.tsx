'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select, Tabs, message } from 'antd';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, PieChart, Pie, Cell } from 'recharts';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { reportService, SalesData } from '@/services/reportService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import styles from '../report.module.css';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CY=new Date().getFullYear(); const YEARS=Array.from({length:4},(_,i)=>CY-i);
type RelKey='7d'|'30d'|'90d'|'month'|'year'|'custom';
const RELS:[RelKey,string][]=[['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['month','This Month'],['year','This Year']];
function buildRange(rel:RelKey,mo:number,yr:number){ const now=new Date(),p=(n:number)=>String(n).padStart(2,'0'),f=(d:Date)=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  if(rel==='7d'){const d=new Date(now);d.setDate(d.getDate()-6);return{from:f(d),to:f(now)};}
  if(rel==='30d'){const d=new Date(now);d.setDate(d.getDate()-29);return{from:f(d),to:f(now)};}
  if(rel==='90d'){const d=new Date(now);d.setDate(d.getDate()-89);return{from:f(d),to:f(now)};}
  if(rel==='month'){return{from:`${now.getFullYear()}-${p(now.getMonth()+1)}-01`,to:f(now)};}
  const last=new Date(yr,mo,0).getDate();return{from:`${yr}-${p(mo)}-01`,to:`${yr}-${p(mo)}-${last}`}; }

const CAT_COLORS=['#1d4ed8','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#ea580c','#6366f1','#10b981','#f59e0b'];
const catLabel=(c:string)=>c.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
const fmt=(n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:0})}`;

export default function SalesReport() {
  const router=useRouter(); const {user,initializing}=useSelector((s:RootState)=>s.auth);
  const selectedWarehouse=useSelector((s:RootState)=>s.warehouse.selected);
  const [data,setData]=useState<SalesData|null>(null); const [loading,setLoading]=useState(true);
  const [downloading,setDownloading]=useState<string|null>(null);
  const [rel,setRel]=useState<RelKey>('90d'); const [selMo,setSelMo]=useState(new Date().getMonth()+1); const [selYr,setSelYr]=useState(CY);

  useEffect(()=>{if(!initializing&&!user)router.replace('/login');},[user,initializing,router]);
  const load=useCallback(async()=>{ if(!user)return; const {from,to}=buildRange(rel,selMo,selYr); setLoading(true);
    const r=await reportService.sales({from,to,warehouse:selectedWarehouse}); setData(r.data as unknown as SalesData); setLoading(false);
  },[user,rel,selMo,selYr,selectedWarehouse]);
  useEffect(()=>{load();},[load]);

  const dl=async(fn:()=>Promise<void>,key:string)=>{ setDownloading(key); try{await fn();}catch{message.error('Download failed');}finally{setDownloading(null);} };
  const {from,to}=buildRange(rel,selMo,selYr);
  if(initializing||!user)return null;
  const k=data?.kpi;
  const totalRev=data?.topProducts?.reduce((s,p)=>s+p.revenue,0)||1;

  return(
    <div className={styles.root}><AppNav/>
      <main className={styles.main}><TopBar title="Sales Report"/>
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div><div className={styles.pageTitle}>📊 Sales Report</div><div className={styles.pageSub}>Revenue, orders and product performance analysis</div></div>
            <div className={styles.exportRow}>
              <button className={`${styles.exportBtn} ${styles.excelBtn}`} disabled={downloading==='excel'} onClick={()=>dl(()=>reportService.downloadSalesExcel(from,to,selectedWarehouse),'excel')}><FileExcelOutlined/> {downloading==='excel'?'Generating…':'Export Excel'}</button>
              <button className={`${styles.exportBtn} ${styles.pdfBtn}`} disabled={downloading==='pdf'} onClick={()=>dl(()=>reportService.downloadSalesPdf(from,to,selectedWarehouse),'pdf')}><FilePdfOutlined/> {downloading==='pdf'?'Generating…':'Export PDF'}</button>
            </div>
          </div>

          {/* Filter */}
          <div className={styles.filterBar}>
            <div className={styles.relChips}>{RELS.map(([key,label])=><button key={key} className={`${styles.relChip} ${rel===key&&rel!=='custom'?styles.relChipActive:''}`} onClick={()=>setRel(key as RelKey)}>{label}</button>)}</div>
            <div className={styles.filterRight}>
              <Select value={selMo} onChange={v=>{setSelMo(v);setRel('custom');}} className={styles.sel} options={MONTHS.map((m,i)=>({value:i+1,label:m}))}/>
              <Select value={selYr} onChange={v=>{setSelYr(v);setRel('custom');}} className={styles.sel} options={YEARS.map(y=>({value:y,label:String(y)}))}/>
            </div>
          </div>

          {/* KPI strip */}
          <div className={styles.kpiStrip}>
            {[{label:'Revenue',value:fmt(k?.revenue??0),color:'#1d4ed8'},{label:'Orders',value:k?.totalOrders??0,color:'#6366f1'},{label:'Active Orders',value:k?.activeOrders??0,color:'#059669'},{label:'Avg Order Value',value:fmt(k?.avgOrderValue??0),color:'#d97706'}].map(kk=>(
              <div key={kk.label} className={styles.kpiItem}><div className={styles.kpiItemVal} style={{color:kk.color}}>{loading?'—':kk.value}</div><div className={styles.kpiItemLabel}>{kk.label}</div></div>
            ))}
          </div>

          {/* Revenue trend */}
          <div className={styles.fullCard}>
            <div className={styles.cardTitle}>Revenue & Order Volume Trend</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data?.revenueTrend??[]} margin={{left:0,right:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                <YAxis yAxisId="rev" tick={{fontSize:10}} tickFormatter={v=>`₹${v}`}/>
                <YAxis yAxisId="ord" orientation="right" tick={{fontSize:10}}/>
                <Tooltip/>
                <Legend/>
                <Bar yAxisId="ord" dataKey="orders" name="Orders" fill="#e0e7ff" radius={[4,4,0,0]}/>
                <Line yAxisId="rev" type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#1d4ed8" strokeWidth={2.5} dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 3-col row */}
          <div className={styles.row3}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>🏆 Top Products</div>
              <div className={styles.rankTable}>
                <div className={styles.rankHead}><span>#</span><span>Product</span><span>Qty</span><span>Revenue</span><span>Share</span></div>
                {(data?.topProducts??[]).slice(0,8).map((p,i)=>(
                  <div key={i} className={styles.rankRow}>
                    <span className={styles.rank}>{i+1}</span>
                    <div><div className={styles.prodName}>{p.name}</div><div className={styles.skuTag}>{p.sku}</div></div>
                    <span className={styles.qty}>{p.totalQty}</span>
                    <span className={styles.rev}>{fmt(p.revenue)}</span>
                    <div className={styles.sharebar}><div className={styles.sharefill} style={{width:`${Math.round((p.revenue/totalRev)*100)}%`}}/><span className={styles.sharePct}>{Math.round((p.revenue/totalRev)*100)}%</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>🏷️ Sales by Category</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={(data?.byCategory??[]).map(c=>({...c,category:catLabel(c.category)}))} layout="vertical" margin={{left:4,right:24}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                  <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`₹${v}`}/>
                  <YAxis type="category" dataKey="category" tick={{fontSize:10}} width={85}/>
                  <Tooltip/>
                  {(data?.byCategory??[]).map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
                  <Bar dataKey="revenue" name="Revenue">
                    {(data?.byCategory??[]).map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>👥 Top Customers</div>
              <div className={styles.rankTable}>
                <div className={styles.rankHead}><span>#</span><span>Customer</span><span>Orders</span><span>Spend</span></div>
                {(data?.topCustomers??[]).slice(0,8).map((c,i)=>(
                  <div key={i} className={styles.rankRow}>
                    <span className={styles.rank}>{i+1}</span>
                    <div><div className={styles.prodName}>{c.name}</div><div className={styles.skuTag}>{c.city}</div></div>
                    <span className={styles.qty}>{c.orderCount}</span>
                    <span className={styles.rev}>{fmt(c.totalSpend)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2-col row */}
          <div className={styles.row2}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>📅 Orders by Day of Week</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data?.ordersByDayOfWeek??[]} margin={{left:0,right:8}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="day" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:10}}/>
                  <Tooltip/>
                  <Bar dataKey="count" name="Orders" radius={[4,4,0,0]}>
                    {(data?.ordersByDayOfWeek??[]).map((d,i)=>{
                      const max=Math.max(...(data?.ordersByDayOfWeek??[]).map(x=>x.count));
                      return<Cell key={i} fill={d.count===max?'#1d4ed8':'#c7d2fe'}/>;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>💰 Order Value Distribution</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={data?.valueDistribution??[]} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={30} paddingAngle={3}>
                    {(data?.valueDistribution??[]).map((_,i)=><Cell key={i} fill={CAT_COLORS[i]}/>)}
                  </Pie>
                  <Tooltip/>
                  <Legend/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
