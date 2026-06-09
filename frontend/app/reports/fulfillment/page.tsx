'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select, Tag, message } from 'antd';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { reportService, FulfillmentData } from '@/services/reportService';
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

const STATUS_COLORS:Record<string,string>={pending:'#f59e0b',confirmed:'#0891b2',picking:'#7c3aed',packed:'#d97706',shipped:'#3b82f6',delivered:'#10b981'};
const PRIORITY_COLORS:Record<string,string>={urgent:'#dc2626',high:'#f59e0b',normal:'#6366f1'};
const ROLE_TAG_COLORS:Record<string,string>={admin:'blue',manager:'purple',staff:'green'};

export default function FulfillmentReport() {
  const router=useRouter();
  const {user,initializing}=useSelector((s:RootState)=>s.auth);
  const selectedWarehouse=useSelector((s:RootState)=>s.warehouse.selected);
  const [data,setData]=useState<FulfillmentData|null>(null);
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
    const r=await reportService.fulfillment({from,to,warehouse:selectedWarehouse});
    setData(r.data as unknown as FulfillmentData);
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
  const maxPipeline=data?.pipeline?.[0]?.count||1;

  const priorityChartData=(data?.priorityCounts??[]).map(p=>({
    priority:p.priority.charAt(0).toUpperCase()+p.priority.slice(1),
    total:p.count,
    delivered:p.delivered,
    rate:p.count>0?Math.round((p.delivered/p.count)*100):0,
  }));

  return(
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title="Fulfillment Report"/>
        <div className={styles.content}>

          <div className={styles.pageHeader}>
            <div>
              <div className={styles.pageTitle}>⚡ Fulfillment Report</div>
              <div className={styles.pageSub}>Order pipeline, processing speed and staff performance</div>
            </div>
            <div className={styles.exportRow}>
              <button className={`${styles.exportBtn} ${styles.excelBtn}`} disabled={downloading==='excel'}
                onClick={()=>dl(()=>reportService.downloadFulfillmentExcel(from,to,selectedWarehouse),'excel')}>
                <FileExcelOutlined/> {downloading==='excel'?'Generating…':'Export Excel'}
              </button>
              <button className={`${styles.exportBtn} ${styles.pdfBtn}`} disabled={downloading==='pdf'}
                onClick={()=>dl(()=>reportService.downloadFulfillmentPdf(from,to,selectedWarehouse),'pdf')}>
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
              {label:'Fulfillment Rate',   value:`${k?.fulfillmentRate??0}%`,                         color:'#059669'},
              {label:'Avg Ship Time',      value:`${k?.avgShipHours??0}h`,                            color:'#1d4ed8'},
              {label:'Cancellation Rate',  value:`${k?.cancellationRate??0}%`,                        color:'#dc2626'},
              {label:'Items Picked',       value:(k?.itemsPicked??0).toLocaleString('en-IN'),         color:'#7c3aed'},
              {label:'Avg Pending Age',    value:`${k?.avgPendingAgeHours??0}h`,                      color:'#d97706'},
              {label:'Orders Delivered',   value:k?.delivered??0,                                      color:'#10b981'},
            ].map(kk=>(
              <div key={kk.label} className={styles.kpiItem}>
                <div className={styles.kpiItemVal} style={{color:kk.color}}>{loading?'—':kk.value}</div>
                <div className={styles.kpiItemLabel}>{kk.label}</div>
              </div>
            ))}
          </div>

          {/* Pipeline funnel + Priority breakdown */}
          <div className={styles.row2}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>🔀 Order Pipeline Funnel</div>
              {(data?.pipeline??[]).map(s=>(
                <div key={s.status} className={styles.funnelRow}>
                  <span className={styles.funnelLabel}>{s.status.charAt(0).toUpperCase()+s.status.slice(1)}</span>
                  <div className={styles.funnelBarWrap}>
                    <div className={styles.funnelBarFill}
                      style={{width:`${Math.max(4,Math.round((s.count/maxPipeline)*100))}%`,background:STATUS_COLORS[s.status]??'#6366f1'}}>
                      {s.count>0?s.count:''}
                    </div>
                  </div>
                  <span className={styles.funnelCount}>{s.count}</span>
                </div>
              ))}
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>🚦 Orders by Priority</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityChartData} margin={{left:0,right:8}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="priority" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:10}}/>
                  <Tooltip/>
                  <Legend/>
                  <Bar dataKey="total" name="Total Orders" fill="#e0e7ff" radius={[4,4,0,0]}/>
                  <Bar dataKey="delivered" name="Delivered" radius={[4,4,0,0]}>
                    {priorityChartData.map((p,i)=><Cell key={i} fill={PRIORITY_COLORS[p.priority.toLowerCase()]??'#6366f1'}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Daily processing + Staff performance */}
          <div className={styles.row2}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>📅 Daily Order Volume</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data?.dailyProcessing??[]} margin={{left:0,right:8}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis dataKey="date" tick={{fontSize:10}} tickFormatter={d=>d.slice(5)}/>
                  <YAxis tick={{fontSize:10}}/>
                  <Tooltip/>
                  <Bar dataKey="created" name="Orders Created" fill="#6366f1" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>👷 Staff Performance (Orders Handled)</div>
              <div className={styles.staffTable}>
                <div className={styles.staffHead}><span>Name</span><span>Role</span><span>Orders</span></div>
                {(data?.staffPerformance??[]).length===0&&(
                  <div style={{padding:'16px',textAlign:'center',color:'#94a3b8',fontSize:13}}>No activity in this period</div>
                )}
                {(data?.staffPerformance??[]).map((s,i)=>(
                  <div key={i} className={styles.staffRow} style={{background:i%2===0?'#fff':'#f8fafc'}}>
                    <span style={{fontWeight:600,color:'#1e293b'}}>{s.name}</span>
                    <Tag color={ROLE_TAG_COLORS[s.role]??'default'} style={{fontSize:10}}>{s.role}</Tag>
                    <span style={{fontWeight:700,color:'#1d4ed8',textAlign:'center'}}>{s.orderCount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending orders */}
          <div className={styles.fullCard}>
            <div className={styles.cardTitle}>
              ⏳ Pending &amp; Confirmed Orders
              {(data?.pendingOrders??[]).length>0&&(
                <span style={{marginLeft:8,background:'#fef2f2',color:'#dc2626',border:'1px solid #fca5a5',borderRadius:12,padding:'1px 8px',fontSize:11,fontWeight:700}}>
                  {data!.pendingOrders.length} awaiting action
                </span>
              )}
            </div>
            <div className={styles.pendingTable}>
              <div className={styles.pendHead}>
                <span>Order #</span><span>Customer</span><span>Status</span><span>Priority</span><span>Age (hrs)</span><span>Created</span>
              </div>
              {(data?.pendingOrders??[]).length===0&&(
                <div style={{padding:'24px',textAlign:'center',color:'#94a3b8',fontSize:13}}>
                  No pending orders — all caught up! ✅
                </div>
              )}
              {(data?.pendingOrders??[]).map((o,i)=>(
                <div key={o.id} className={styles.pendRow} style={{background:i%2===0?'#fff':'#f8fafc',borderLeft:o.ageHours>48?'3px solid #dc2626':'3px solid transparent'}}>
                  <span style={{fontFamily:'monospace',fontSize:11,color:'#1d4ed8',fontWeight:700}}>{o.orderNumber}</span>
                  <span style={{fontSize:12,fontWeight:600}}>{o.customerName??'—'}</span>
                  <Tag color={STATUS_COLORS[o.status]??'default'} style={{fontSize:10}}>{o.status}</Tag>
                  <Tag color={PRIORITY_COLORS[o.priority]??'default'} style={{fontSize:10}}>{o.priority}</Tag>
                  <span className={o.ageHours>24?styles.ageLate:styles.ageNormal}>{o.ageHours}h</span>
                  <span style={{fontSize:11,color:'#94a3b8'}}>{new Date(o.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
