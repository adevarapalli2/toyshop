'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select, message } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { reportService, ExecKpi } from '@/services/reportService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import styles from './page.module.css';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CY=new Date().getFullYear();
const YEARS=Array.from({length:4},(_,i)=>CY-i);
type RelKey='today'|'7d'|'30d'|'90d'|'month'|'year'|'custom';
const RELS:[RelKey,string][]=[['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['month','This Month'],['year','This Year']];
function buildRange(rel:RelKey,mo:number,yr:number){
  const now=new Date(),p=(n:number)=>String(n).padStart(2,'0'),f=(d:Date)=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  if(rel==='7d'){const d=new Date(now);d.setDate(d.getDate()-6);return{from:f(d),to:f(now)};}
  if(rel==='30d'){const d=new Date(now);d.setDate(d.getDate()-29);return{from:f(d),to:f(now)};}
  if(rel==='90d'){const d=new Date(now);d.setDate(d.getDate()-89);return{from:f(d),to:f(now)};}
  if(rel==='month'){return{from:`${now.getFullYear()}-${p(now.getMonth()+1)}-01`,to:f(now)};}
  if(rel==='year'){return{from:`${now.getFullYear()}-01-01`,to:f(now)};}
  const last=new Date(yr,mo,0).getDate();return{from:`${yr}-${p(mo)}-01`,to:`${yr}-${p(mo)}-${last}`};
}

const REPORT_CARDS = [
  { key:'sales',       icon:'📊', title:'Sales Report',       desc:'Revenue trends, top products and customers analysis', color:'#1d4ed8', bg:'linear-gradient(135deg,#1d4ed8,#0ea5e9)', href:'/reports/sales',       excel:'Sales Excel',  pdf:'Sales PDF' },
  { key:'inventory',   icon:'📦', title:'Inventory Report',    desc:'Stock valuation, fast movers and reorder analysis',   color:'#059669', bg:'linear-gradient(135deg,#059669,#34d399)', href:'/reports/inventory',    excel:'Inventory Excel', pdf:'Inventory PDF' },
  { key:'fulfillment', icon:'⚡', title:'Fulfillment Report',  desc:'Order processing, pipeline and staff performance',    color:'#d97706', bg:'linear-gradient(135deg,#d97706,#fbbf24)', href:'/reports/fulfillment',  excel:'Fulfillment Excel', pdf:null },
  { key:'shipments',   icon:'🚚', title:'Shipments Report',    desc:'Carrier performance, delivery rates and cost analysis',color:'#6366f1', bg:'linear-gradient(135deg,#6366f1,#818cf8)', href:'/reports/shipments',    excel:'Shipments Excel', pdf:'Shipments PDF' },
];
const HEALTH_COLORS=['#10b981','#f59e0b','#ef4444','#3b82f6'];

export default function ReportsHub() {
  const router=useRouter();
  const {user,initializing}=useSelector((s:RootState)=>s.auth);
  const [kpi,setKpi]=useState<ExecKpi|null>(null);
  const [trend,setTrend]=useState<{date:string;revenue:number;orders:number}[]>([]);
  const [loading,setLoading]=useState(true);
  const [downloading,setDownloading]=useState<string|null>(null);
  const [rel,setRel]=useState<RelKey>('90d');
  const [selMo,setSelMo]=useState(new Date().getMonth()+1);
  const [selYr,setSelYr]=useState(CY);

  useEffect(()=>{if(!initializing&&!user)router.replace('/login');},[user,initializing,router]);

  const load=useCallback(async()=>{
    if(!user)return;
    const {from,to}=buildRange(rel,selMo,selYr);
    setLoading(true);
    const r=await reportService.executive({from,to});
    setKpi(r.data.kpi); setTrend(r.data.revenueTrend??[]);
    setLoading(false);
  },[user,rel,selMo,selYr]);

  useEffect(()=>{load();},[load]);

  const dl=async(fn:()=>Promise<void>,key:string)=>{
    setDownloading(key);
    try{await fn();}catch{message.error('Download failed');}
    finally{setDownloading(null);}
  };

  const {from,to}=buildRange(rel,selMo,selYr);
  if(initializing||!user)return null;

  const kpiRows=[
    [{label:'Total Revenue',value:`₹${(kpi?.totalRevenue??0).toLocaleString('en-IN')}`,icon:'💰',color:'#1d4ed8',sub:'Orders period'},
     {label:'Total Orders',value:kpi?.totalOrders??0,icon:'🛒',color:'#6366f1',sub:'All statuses'},
     {label:'Fulfillment Rate',value:`${kpi?.fulfillmentRate??0}%`,icon:'✅',color:'#059669',sub:'Orders delivered'},
     {label:'On-Time Delivery',value:`${kpi?.onTimeDeliveryRate??0}%`,icon:'🚚',color:'#0891b2',sub:'Shipments on time'}],
    [{label:'Active SKUs',value:kpi?.activeSkus??0,icon:'📦',color:'#7c3aed',sub:'Products in catalogue',href:'/inventory'},
     {label:'Inventory Value',value:`₹${(kpi?.inventoryValue??0).toLocaleString('en-IN')}`,icon:'₹',color:'#d97706',sub:'At cost price'},
     {label:'Low Stock Items',value:kpi?.lowStockItems??0,icon:'⚠️',color:'#dc2626',sub:'Need reorder',href:'/inventory/alerts'},
     {label:'Active Customers',value:kpi?.activeCustomers??0,icon:'👥',color:'#059669',sub:'In database',href:'/orders/list'}],
  ];

  return(
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title="Reports & Analytics"/>
        <div className={styles.content}>

          {/* Filter */}
          <div className={styles.filterBar}>
            <div className={styles.filterLeft}>
              <span className={styles.filterLabel}>📅 Period:</span>
              <div className={styles.relChips}>{RELS.map(([key,label])=><button key={key} className={`${styles.relChip} ${rel===key&&rel!=='custom'?styles.relChipActive:''}`} onClick={()=>setRel(key as RelKey)}>{label}</button>)}</div>
            </div>
            <div className={styles.filterRight}>
              <Select value={selMo} onChange={v=>{setSelMo(v);setRel('custom');}} className={styles.sel} options={MONTHS.map((m,i)=>({value:i+1,label:m}))}/>
              <Select value={selYr} onChange={v=>{setSelYr(v);setRel('custom');}} className={styles.sel} options={YEARS.map(y=>({value:y,label:String(y)}))}/>
            </div>
          </div>

          {/* KPI rows */}
          {kpiRows.map((row,ri)=>(
            <div key={ri} className={styles.kpiRow}>
              {row.map(k=>(
                <div key={k.label} className={`${styles.kpiCard} ${(k as {href?:string}).href?styles.kpiClickable:''}`}
                  onClick={()=>(k as {href?:string}).href&&router.push((k as {href?:string}).href!)}>
                  <div className={styles.kpiTop}>
                    <div className={styles.kpiIconWrap}><span>{k.icon}</span></div>
                    <div className={styles.kpiValueBlock}>
                      <div className={styles.kpiValue} style={{color:k.color}}>{loading?'—':k.value}</div>
                      <div className={styles.kpiLabel}>{k.label}</div>
                      <div className={styles.kpiSub}>{k.sub}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Top product strip */}
          {kpi?.topProduct&&<div className={styles.topProductStrip}>⭐ <b>Top Product this period:</b> {kpi.topProduct} · <b>{kpi.totalShipments}</b> shipments tracked</div>}

          {/* Revenue trend full width */}
          <div className={styles.fullCard}>
            <div className={styles.cardTitle}>📈 Revenue Trend</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend} margin={{left:0,right:20}}>
                <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25}/><stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.02}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`₹${v}`}/>
                <Tooltip/>
                <Area type="monotone" dataKey="revenue" stroke="#1d4ed8" strokeWidth={2} fill="url(#rg)" name="Revenue (₹)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Report cards */}
          <div className={styles.reportGrid}>
            {REPORT_CARDS.map(r=>(
              <div key={r.key} className={styles.reportCard}>
                <div className={styles.rcHeader} style={{background:r.bg}}>
                  <span className={styles.rcIcon}>{r.icon}</span>
                  <div className={styles.rcTitle}>{r.title}</div>
                </div>
                <div className={styles.rcBody}>
                  <p className={styles.rcDesc}>{r.desc}</p>
                  <div className={styles.rcActions}>
                    <button className={styles.rcViewBtn} onClick={()=>router.push(r.href)}>View Report →</button>
                    <div className={styles.rcExports}>
                      {r.excel&&<button className={`${styles.exportBtn} ${styles.excelBtn}`}
                        disabled={downloading===`${r.key}-excel`}
                        onClick={async()=>{
                          if(r.key==='sales')        await dl(()=>reportService.downloadSalesExcel(from,to),`${r.key}-excel`);
                          if(r.key==='inventory')    await dl(()=>reportService.downloadInventoryExcel(from,to),`${r.key}-excel`);
                          if(r.key==='fulfillment')  await dl(()=>reportService.downloadFulfillmentExcel(from,to),`${r.key}-excel`);
                          if(r.key==='shipments')    await dl(()=>reportService.downloadShipmentsExcel(from,to),`${r.key}-excel`);
                        }}>
                        <FileExcelOutlined/> {downloading===`${r.key}-excel`?'…':'Excel'}
                      </button>}
                      {r.pdf&&<button className={`${styles.exportBtn} ${styles.pdfBtn}`}
                        disabled={downloading===`${r.key}-pdf`}
                        onClick={async()=>{
                          if(r.key==='sales')        await dl(()=>reportService.downloadSalesPdf(from,to),`${r.key}-pdf`);
                          if(r.key==='inventory')    await dl(()=>reportService.downloadInventoryPdf(from,to),`${r.key}-pdf`);
                          if(r.key==='fulfillment')  await dl(()=>reportService.downloadFulfillmentPdf(from,to),`${r.key}-pdf`);
                          if(r.key==='shipments')    await dl(()=>reportService.downloadShipmentsPdf(from,to),`${r.key}-pdf`);
                        }}>
                        <FilePdfOutlined/> {downloading===`${r.key}-pdf`?'…':'PDF'}
                      </button>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>
    </div>
  );
}
