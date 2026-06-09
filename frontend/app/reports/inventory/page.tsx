'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select, Tabs, Tag, message } from 'antd';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart } from 'recharts';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { reportService, InventoryData } from '@/services/reportService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import StockBadge from '@/components/inventory/StockBadge';
import type { StockStatus } from '@/services/inventoryService';
import styles from '../report.module.css';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CY=new Date().getFullYear(); const YEARS=Array.from({length:4},(_,i)=>CY-i);
type RelKey='7d'|'30d'|'90d'|'month'|'year'|'custom';
const RELS:[RelKey,string][]=[['30d','30 Days'],['90d','90 Days'],['month','This Month'],['year','This Year']];
function buildRange(rel:RelKey,mo:number,yr:number){ const now=new Date(),p=(n:number)=>String(n).padStart(2,'0'),f=(d:Date)=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  if(rel==='7d'){const d=new Date(now);d.setDate(d.getDate()-6);return{from:f(d),to:f(now)};}
  if(rel==='30d'){const d=new Date(now);d.setDate(d.getDate()-29);return{from:f(d),to:f(now)};}
  if(rel==='90d'){const d=new Date(now);d.setDate(d.getDate()-89);return{from:f(d),to:f(now)};}
  if(rel==='month'){return{from:`${now.getFullYear()}-${p(now.getMonth()+1)}-01`,to:f(now)};}
  const last=new Date(yr,mo,0).getDate();return{from:`${yr}-${p(mo)}-01`,to:`${yr}-${p(mo)}-${last}`}; }

const HEALTH_COLORS=['#10b981','#f59e0b','#ef4444','#3b82f6'];
const CAT_COLORS=['#1d4ed8','#059669','#d97706','#dc2626','#7c3aed','#0891b2','#ea580c','#6366f1','#10b981','#f59e0b'];
const catLabel=(c:string)=>c.replace(/-/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
const fmt=(n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:0})}`;

export default function InventoryReport() {
  const router=useRouter(); const {user,initializing}=useSelector((s:RootState)=>s.auth);
  const selectedWarehouse=useSelector((s:RootState)=>s.warehouse.selected);
  const [data,setData]=useState<InventoryData|null>(null); const [loading,setLoading]=useState(true);
  const [downloading,setDownloading]=useState<string|null>(null);
  const [rel,setRel]=useState<RelKey>('90d'); const [selMo,setSelMo]=useState(new Date().getMonth()+1); const [selYr,setSelYr]=useState(CY);

  useEffect(()=>{if(!initializing&&!user)router.replace('/login');},[user,initializing,router]);
  const load=useCallback(async()=>{ if(!user)return; const {from,to}=buildRange(rel,selMo,selYr); setLoading(true);
    const r=await reportService.inventory({from,to,warehouse:selectedWarehouse}); setData(r.data as unknown as InventoryData); setLoading(false);
  },[user,rel,selMo,selYr,selectedWarehouse]);
  useEffect(()=>{load();},[load]);

  const dl=async(fn:()=>Promise<void>,key:string)=>{ setDownloading(key); try{await fn();}catch{message.error('Download failed');}finally{setDownloading(null);} };
  const {from,to}=buildRange(rel,selMo,selYr);
  if(initializing||!user)return null;
  const k=data?.kpi; const h=data?.stockHealth;
  const healthData=h?[{name:'In Stock',value:h.inStock},{name:'Low Stock',value:h.lowStock},{name:'Out of Stock',value:h.outOfStock},{name:'Overstock',value:h.overstock}]:[];

  return(
    <div className={styles.root}><AppNav/>
      <main className={styles.main}><TopBar title="Inventory Report"/>
        <div className={styles.content}>
          <div className={styles.pageHeader}>
            <div><div className={styles.pageTitle}>📦 Inventory Report</div><div className={styles.pageSub}>Stock valuation, movement analysis and reorder intelligence</div></div>
            <div className={styles.exportRow}>
              <button className={`${styles.exportBtn} ${styles.excelBtn}`} disabled={downloading==='excel'} onClick={()=>dl(()=>reportService.downloadInventoryExcel(from,to,selectedWarehouse),'excel')}><FileExcelOutlined/> {downloading==='excel'?'Generating…':'Export Excel'}</button>
              <button className={`${styles.exportBtn} ${styles.pdfBtn}`} disabled={downloading==='pdf'} onClick={()=>dl(()=>reportService.downloadInventoryPdf(from,to,selectedWarehouse),'pdf')}><FilePdfOutlined/> {downloading==='pdf'?'Generating…':'Export PDF'}</button>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.relChips}>{RELS.map(([key,label])=><button key={key} className={`${styles.relChip} ${rel===key&&rel!=='custom'?styles.relChipActive:''}`} onClick={()=>setRel(key as RelKey)}>{label}</button>)}</div>
            <div className={styles.filterRight}>
              <Select value={selMo} onChange={v=>{setSelMo(v);setRel('custom');}} className={styles.sel} options={MONTHS.map((m,i)=>({value:i+1,label:m}))}/>
              <Select value={selYr} onChange={v=>{setSelYr(v);setRel('custom');}} className={styles.sel} options={YEARS.map(y=>({value:y,label:String(y)}))}/>
            </div>
          </div>

          <div className={styles.kpiStrip}>
            {[{label:'Total SKUs',value:k?.totalSkus??0,color:'#1d4ed8'},{label:'Stock Cost Value',value:fmt(k?.totalCostValue??0),color:'#d97706'},{label:'Stock Sell Value',value:fmt(k?.totalSellValue??0),color:'#059669'},{label:'Potential Margin',value:fmt(k?.potentialMargin??0),color:'#7c3aed'},{label:'Items to Reorder',value:k?.itemsToReorder??0,color:'#dc2626'}].map(kk=>(
              <div key={kk.label} className={styles.kpiItem}><div className={styles.kpiItemVal} style={{color:kk.color}}>{loading?'—':kk.value}</div><div className={styles.kpiItemLabel}>{kk.label}</div></div>
            ))}
          </div>

          <div className={styles.row2}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>🩺 Stock Health Distribution</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={healthData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                  {healthData.map((_,i)=><Cell key={i} fill={HEALTH_COLORS[i]}/>)}
                </Pie><Tooltip/><Legend iconType="circle" iconSize={8}/></PieChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.card}>
              <div className={styles.cardTitle}>₹ Inventory Value by Category (Sell Value)</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(data?.byCategoryValue??[]).map(c=>({...c,category:catLabel(c.category)}))} layout="vertical" margin={{left:4,right:20}}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                  <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`₹${v}`}/>
                  <YAxis type="category" dataKey="category" tick={{fontSize:10}} width={90}/>
                  <Tooltip/>
                  <Bar dataKey="sellValue" name="Sell Value" radius={[0,4,4,0]}>
                    {(data?.byCategoryValue??[]).map((_,i)=><Cell key={i} fill={CAT_COLORS[i%CAT_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.fullCard}>
            <div className={styles.cardTitle}>📊 Stock Movement Trend (IN vs OUT)</div>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data?.movementTrend??[]} margin={{left:0,right:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                <YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Legend/>
                <Bar dataKey="IN" name="Stock In" fill="#10b981" radius={[2,2,0,0]}/>
                <Bar dataKey="OUT" name="Stock Out" fill="#ef4444" radius={[2,2,0,0]}/>
                <Bar dataKey="ADJUSTMENT" name="Adjustments" fill="#6366f1" radius={[2,2,0,0]}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <Tabs items={[
            { key:'fast', label:'🚀 Fast Movers', children:(
              <div className={styles.rankTable}>
                <div style={{display:'grid',gridTemplateColumns:'24px 1fr 80px 80px',gap:'6px',padding:'5px 2px',fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase',borderBottom:'2px solid #f1f5f9'}}><span>#</span><span>Product</span><span>Qty Out</span><span>Moves</span></div>
                {(data?.fastMovers??[]).map((f,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'24px 1fr 80px 80px',gap:'6px',padding:'8px 2px',fontSize:12,borderBottom:'1px solid #f8fafc',alignItems:'center'}}>
                    <span className={styles.rank}>{i+1}</span>
                    <div><div className={styles.prodName}>{f.name}</div><div className={styles.skuTag}>{f.sku}</div></div>
                    <span className={styles.rev}>{f.outQty}</span>
                    <span className={styles.qty}>{f.moveCount}</span>
                  </div>
                ))}
              </div>
            )},
            { key:'slow', label:'🐌 Slow Movers', children:(
              <div className={styles.rankTable}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 100px 80px 80px',gap:'6px',padding:'5px 2px',fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase',borderBottom:'2px solid #f1f5f9'}}><span>Product</span><span>Category</span><span>Qty</span><span>Value (₹)</span></div>
                {(data?.slowMovers??[]).map((s,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 100px 80px 80px',gap:'6px',padding:'8px 2px',fontSize:12,borderBottom:'1px solid #f8fafc',alignItems:'center'}}>
                    <div><div className={styles.prodName}>{s.name}</div><div className={styles.skuTag}>{s.sku}</div></div>
                    <Tag color="default" style={{fontSize:10}}>{catLabel(s.category)}</Tag>
                    <span className={styles.qty}>{s.quantity}</span>
                    <span className={styles.rev}>{fmt(s.value)}</span>
                  </div>
                ))}
              </div>
            )},
            { key:'reorder', label:'🚨 Reorder List', children:(
              <div className={styles.rankTable}>
                <div style={{display:'grid',gridTemplateColumns:'80px 1fr 80px 60px 60px 70px 80px',gap:'6px',padding:'5px 2px',fontSize:11,color:'#64748b',fontWeight:700,textTransform:'uppercase',borderBottom:'2px solid #f1f5f9'}}><span>SKU</span><span>Product</span><span>Category</span><span>Current</span><span>Min</span><span>Shortage</span><span>Location</span></div>
                {(data?.reorderList??[]).map((r,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'80px 1fr 80px 60px 60px 70px 80px',gap:'6px',padding:'8px 2px',fontSize:12,borderBottom:'1px solid #f8fafc',alignItems:'center',background:r.current===0?'#fff5f5':''}}>
                    <span className={styles.skuTag} style={{color:'#1d4ed8'}}>{r.sku}</span>
                    <span className={styles.prodName}>{r.name}</span>
                    <Tag color="default" style={{fontSize:10}}>{catLabel(r.category)}</Tag>
                    <span style={{fontWeight:700,color:r.current===0?'#dc2626':'#d97706'}}>{r.current}</span>
                    <span className={styles.qty}>{r.min}</span>
                    <span style={{fontWeight:700,color:'#dc2626'}}>-{r.shortage}</span>
                    <span className={styles.skuTag}>{r.location}</span>
                  </div>
                ))}
              </div>
            )},
          ]}/>
        </div>
      </main>
    </div>
  );
}
