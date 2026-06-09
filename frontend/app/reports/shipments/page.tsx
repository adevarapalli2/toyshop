'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select, message } from 'antd';
import { ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { reportService, ShipmentsReportData } from '@/services/reportService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import styles from '../report.module.css';

const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CY=new Date().getFullYear();
const YEARS=Array.from({length:4},(_,i)=>CY-i);
type RelKey='7d'|'30d'|'90d'|'month'|'year'|'custom';
const RELS:[RelKey,string][]=[['7d','7 Days'],['30d','30 Days'],['90d','90 Days'],['month','This Month'],['year','This Year']];

function buildRange(rel:RelKey,mo:number,yr:number){
  const now=new Date(),p=(n:number)=>String(n).padStart(2,'0'),f=(d:Date)=>`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  if(rel==='7d'){const d=new Date(now);d.setDate(d.getDate()-6);return{from:f(d),to:f(now)};}
  if(rel==='30d'){const d=new Date(now);d.setDate(d.getDate()-29);return{from:f(d),to:f(now)};}
  if(rel==='90d'){const d=new Date(now);d.setDate(d.getDate()-89);return{from:f(d),to:f(now)};}
  if(rel==='month'){return{from:`${now.getFullYear()}-${p(now.getMonth()+1)}-01`,to:f(now)};}
  const last=new Date(yr,mo,0).getDate();return{from:`${yr}-${p(mo)}-01`,to:`${yr}-${p(mo)}-${last}`};
}

const SVC_COLORS=['#6366f1','#0891b2','#d97706','#059669','#dc2626','#1d4ed8'];
const fmt=(n:number)=>`₹${n.toLocaleString('en-IN',{maximumFractionDigits:0})}`;

export default function ShipmentsReport() {
  const router=useRouter();
  const {user,initializing}=useSelector((s:RootState)=>s.auth);
  const selectedWarehouse=useSelector((s:RootState)=>s.warehouse.selected);
  const [data,setData]=useState<ShipmentsReportData|null>(null);
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
    const r=await reportService.shipments({from,to,warehouse:selectedWarehouse});
    setData(r.data as unknown as ShipmentsReportData);
    setLoading(false);
  },[user,rel,selMo,selYr,selectedWarehouse]);

  useEffect(()=>{load();},[load]);

  const dl=async(fn:()=>Promise<void>,key:string)=>{
    setDownloading(key);
    try{await fn();}catch{message.error('Download failed');}
    finally{setDownloading(null);}
  };

  const {from,to}=buildRange(rel,selMo,selYr);
  if(initializing||!user)return null;
  const k=data?.kpi;

  return(
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title="Shipments Report"/>
        <div className={styles.content}>

          <div className={styles.pageHeader}>
            <div>
              <div className={styles.pageTitle}>🚚 Shipments Report</div>
              <div className={styles.pageSub}>Carrier performance, delivery rates and shipping cost analysis</div>
            </div>
            <div className={styles.exportRow}>
              <button className={`${styles.exportBtn} ${styles.excelBtn}`} disabled={downloading==='excel'}
                onClick={()=>dl(()=>reportService.downloadShipmentsExcel(from,to,selectedWarehouse),'excel')}>
                <FileExcelOutlined/> {downloading==='excel'?'Generating…':'Export Excel'}
              </button>
              <button className={`${styles.exportBtn} ${styles.pdfBtn}`} disabled={downloading==='pdf'}
                onClick={()=>dl(()=>reportService.downloadShipmentsPdf(from,to,selectedWarehouse),'pdf')}>
                <FilePdfOutlined/> {downloading==='pdf'?'Generating…':'Export PDF'}
              </button>
            </div>
          </div>

          <div className={styles.filterBar}>
            <div className={styles.relChips}>
              {RELS.map(([key,label])=>(
                <button key={key} className={`${styles.relChip} ${rel===key&&rel!=='custom'?styles.relChipActive:''}`}
                  onClick={()=>setRel(key as RelKey)}>{label}</button>
              ))}
            </div>
            <div className={styles.filterRight}>
              <Select value={selMo} onChange={v=>{setSelMo(v);setRel('custom');}} className={styles.sel}
                options={MONTHS.map((m,i)=>({value:i+1,label:m}))}/>
              <Select value={selYr} onChange={v=>{setSelYr(v);setRel('custom');}} className={styles.sel}
                options={YEARS.map(y=>({value:y,label:String(y)}))}/>
            </div>
          </div>

          {/* KPI strip */}
          <div className={styles.kpiStrip}>
            {[
              {label:'Total Shipments',     value:k?.total??0,                          color:'#6366f1'},
              {label:'Delivered',           value:k?.delivered??0,                      color:'#059669'},
              {label:'On-Time Rate',        value:`${k?.onTimeRate??0}%`,               color:'#1d4ed8'},
              {label:'Avg Delivery Days',   value:`${k?.avgDeliveryDays??0}d`,          color:'#d97706'},
              {label:'Total Shipping Cost', value:fmt(k?.totalShippingCost??0),         color:'#0891b2'},
              {label:'Failed Delivery %',   value:`${k?.failedRate??0}%`,               color:'#dc2626'},
            ].map(kk=>(
              <div key={kk.label} className={styles.kpiItem}>
                <div className={styles.kpiItemVal} style={{color:kk.color}}>{loading?'—':kk.value}</div>
                <div className={styles.kpiItemLabel}>{kk.label}</div>
              </div>
            ))}
          </div>

          {/* Delivery trend */}
          <div className={styles.fullCard}>
            <div className={styles.cardTitle}>📈 Shipped vs Delivered Trend</div>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={data?.deliveryTrend??[]} margin={{left:0,right:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                <YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Legend/>
                <Bar dataKey="shipped" name="Shipped" fill="#c7d2fe" radius={[3,3,0,0]}/>
                <Line type="monotone" dataKey="delivered" name="Delivered" stroke="#059669" strokeWidth={2.5} dot={false}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Carrier scorecard + Service type mix */}
          <div className={styles.row2col}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>🏆 Carrier Scorecard</div>
              <div className={styles.scorecardTable}>
                <div className={styles.scHead}>
                  <span>Carrier</span><span>Total</span><span>Delivered</span>
                  <span>On-Time%</span><span>Avg Days</span><span>Total Cost</span><span>Avg Cost</span>
                </div>
                {(data?.carrierScorecard??[]).length===0&&(
                  <div style={{padding:'16px',textAlign:'center',color:'#94a3b8',fontSize:13}}>No shipment data for this period</div>
                )}
                {(data?.carrierScorecard??[]).map((c,i)=>(
                  <div key={c.carrier} className={styles.scRow} style={{background:i%2===0?'#fff':'#f8fafc'}}>
                    <span style={{fontWeight:700,color:'#1e293b'}}>{c.carrier}</span>
                    <span style={{color:'#64748b'}}>{c.total}</span>
                    <span style={{color:'#059669',fontWeight:600}}>{c.delivered}</span>
                    <span className={`${styles.onTime} ${c.onTimeRate>=80?styles.goodRate:styles.badRate}`}>
                      {c.onTimeRate}%
                    </span>
                    <span style={{color:'#64748b'}}>{c.avgDays}d</span>
                    <span style={{color:'#6366f1',fontWeight:700}}>{fmt(c.totalCost)}</span>
                    <span style={{color:'#0891b2'}}>{fmt(c.avgCost)}</span>
                  </div>
                ))}
              </div>

              {/* Carrier on-time bar chart */}
              {(data?.carrierScorecard??[]).length>0&&(
                <ResponsiveContainer width="100%" height={140} style={{marginTop:16}}>
                  <BarChart data={data!.carrierScorecard} margin={{left:0,right:8}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="carrier" tick={{fontSize:10}}/>
                    <YAxis domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`}/>
                    <Tooltip formatter={(v:unknown)=>`${v}%`}/>
                    <Bar dataKey="onTimeRate" name="On-Time %" radius={[4,4,0,0]}>
                      {data!.carrierScorecard.map((c,i)=>(
                        <Cell key={i} fill={c.onTimeRate>=80?'#10b981':c.onTimeRate>=60?'#f59e0b':'#ef4444'}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>📦 Service Type Mix</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={data?.byServiceType??[]} dataKey="count" nameKey="type"
                    cx="50%" cy="50%" outerRadius={80} innerRadius={38} paddingAngle={4}>
                    {(data?.byServiceType??[]).map((_,i)=><Cell key={i} fill={SVC_COLORS[i%SVC_COLORS.length]}/>)}
                  </Pie>
                  <Tooltip/>
                  <Legend iconType="circle" iconSize={8}/>
                </PieChart>
              </ResponsiveContainer>

              {/* Cost insight */}
              {(data?.carrierScorecard??[]).length>0&&(
                <div style={{marginTop:16,borderTop:'1px solid #f1f5f9',paddingTop:12}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>💡 Cost Insights</div>
                  {data!.carrierScorecard.slice(0,3).map((c,i)=>(
                    <div key={c.carrier} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:12,borderBottom:'1px solid #f8fafc'}}>
                      <span style={{color:'#64748b'}}>{c.carrier}</span>
                      <span style={{fontWeight:600,color:'#0891b2'}}>{fmt(c.avgCost)}/shipment</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
