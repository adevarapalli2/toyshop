'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Button, Input, Popconfirm, message, Tag, Progress } from 'antd';
import { ArrowLeftOutlined, UserOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { orderService, OrderDetail, OrderItem, TimelineEvent, STATUS_META, PRIORITY_META, OrderStatus } from '@/services/orderService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import PriorityBadge from '@/components/orders/PriorityBadge';
import OrderTimeline from '@/components/orders/OrderTimeline';
import StockBadge from '@/components/inventory/StockBadge';
import type { StockStatus } from '@/services/inventoryService';
import styles from './page.module.css';

function stockStatus(qty:number,min:number,max:number):StockStatus{
  if(qty===0)return'out_of_stock';if(qty<=min)return'low_stock';if(qty>max)return'overstock';return'in_stock';
}

const NEXT_ACTION: Record<string,{label:string;color:string;next:string}> = {
  pending:   {label:'Confirm Order',    color:'#1d4ed8', next:'confirmed'},
  confirmed: {label:'Start Picking',    color:'#d97706', next:'picking'},
  picking:   {label:'Mark as Packed',   color:'#7c3aed', next:'packed'},
  packed:    {label:'Mark as Shipped',  color:'#0891b2', next:'shipped'},
  shipped:   {label:'Mark as Delivered',color:'#059669', next:'delivered'},
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const [order, setOrder] = useState<OrderDetail|null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [trackingNo, setTrackingNo] = useState('');

  useEffect(()=>{ if(!initializing&&!user)router.replace('/login'); },[user,initializing,router]);

  const load = async() => {
    setLoading(true);
    try {
      const r = await orderService.getById(parseInt(id));
      setOrder(r.data.order); setItems(r.data.items); setTimeline(r.data.timeline);
    } catch { message.error('Failed to load order'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if(user)load(); },[user,id]); // eslint-disable-line

  const advance = async() => {
    if(!order)return;
    const action = NEXT_ACTION[order.status];
    if(!action)return;
    setAdvancing(true);
    try {
      const notes = action.next==='shipped' && trackingNo ? `Tracking: ${trackingNo}` : undefined;
      await orderService.updateStatus(order.id, action.next, notes);
      message.success(`Order ${action.next}`);
      load();
    } catch(e:unknown){ const err=e as{response?:{data?:{message?:string}}};message.error(err.response?.data?.message||'Failed'); }
    finally { setAdvancing(false); }
  };

  const cancel = async() => {
    if(!order)return;
    try { await orderService.cancel(order.id); message.success('Order cancelled'); load(); }
    catch(e:unknown){ const err=e as{response?:{data?:{message?:string}}};message.error(err.response?.data?.message||'Failed'); }
  };

  if(initializing||!user||loading)return(
    <div className={styles.root}><AppNav/><main className={styles.main}><TopBar/><div className={styles.loading}>Loading order…</div></main></div>
  );
  if(!order)return null;

  const action = NEXT_ACTION[order.status];
  const canCancel = !['shipped','delivered','cancelled','returned'].includes(order.status);
  const meta = STATUS_META[order.status as OrderStatus];

  return (
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title={`Order ${order.orderNumber}`}/>
        <div className={styles.content}>

          {/* Back + header */}
          <div className={styles.pageHeader}>
            <button className={styles.backBtn} onClick={()=>router.push('/orders/list')}><ArrowLeftOutlined/> Orders</button>
            <div className={styles.headerInfo}>
              <h2 className={styles.orderNum}>{order.orderNumber}</h2>
              <OrderStatusBadge status={order.status as OrderStatus}/>
              <PriorityBadge priority={order.priority as never}/>
            </div>
            <div className={styles.headerMeta}>
              <span>Created {new Date(order.createdAt).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
              {order.estimatedDelivery&&<span>Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span>}
            </div>
          </div>

          <div className={styles.layout}>
            {/* Left — main content */}
            <div className={styles.leftCol}>

              {/* Items table */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>📦 Order Items</div>
                <div className={styles.itemsTable}>
                  <div className={styles.itemThead}>
                    <span>Product</span><span>Bin</span><span>Ordered</span><span>Picked</span><span>Stock</span><span>Unit Price</span><span>Total</span>
                  </div>
                  {items.map(item=>(
                    <div key={item.id} className={`${styles.itemRow} ${item.status==='cancelled'?styles.cancelled:''}`}>
                      <div>
                        <span className={styles.sku}>{item.productSku}</span>
                        <div className={styles.prodName}>{item.productName}</div>
                        <Tag color="default" style={{fontSize:10,marginTop:2}}>{item.category}</Tag>
                      </div>
                      <span className={styles.bin}>{item.warehouseZone}-{item.binLocation||'?'}</span>
                      <span className={styles.qty}>{item.quantity}</span>
                      <div>
                        <div className={styles.picked}>{item.pickedQty}/{item.quantity}</div>
                        {item.quantity>0&&<Progress percent={Math.round((item.pickedQty/item.quantity)*100)} size="small" showInfo={false} strokeColor={item.pickedQty===item.quantity?'#059669':'#d97706'} style={{width:64}}/>}
                      </div>
                      <StockBadge qty={item.currentStock} min={item.minStock} max={item.maxStock} status={stockStatus(item.currentStock,item.minStock,item.maxStock)} showBar={false}/>
                      <span className={styles.price}>₹{parseFloat(item.unitPrice).toLocaleString('en-IN')}</span>
                      <span className={styles.lineTotal}>₹{parseFloat(item.totalPrice).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className={styles.totals}>
                  <div className={styles.totalRow}><span>Subtotal</span><span>₹{parseFloat(order.subtotal).toLocaleString('en-IN')}</span></div>
                  {parseFloat(order.discountAmount)>0&&<div className={styles.totalRow}><span>Discount</span><span className={styles.discount}>-₹{parseFloat(order.discountAmount).toLocaleString('en-IN')}</span></div>}
                  <div className={styles.totalRow}><span>Tax (18% GST)</span><span>₹{parseFloat(order.taxAmount).toLocaleString('en-IN')}</span></div>
                  <div className={`${styles.totalRow} ${styles.grandTotal}`}><span>Total</span><span>₹{parseFloat(order.totalAmount).toLocaleString('en-IN')}</span></div>
                </div>
              </div>

              {/* Notes */}
              {order.notes&&<div className={styles.card}><div className={styles.cardTitle}>📝 Notes</div><p className={styles.notes}>{order.notes}</p></div>}
            </div>

            {/* Right — sidebar */}
            <div className={styles.rightCol}>

              {/* Action card */}
              <div className={styles.actionCard} style={{borderColor:`${meta.color}30`}}>
                <div className={styles.currentStatus}>
                  <span className={styles.statusLabel}>Current Status</span>
                  <OrderStatusBadge status={order.status as OrderStatus}/>
                </div>

                {action && (
                  <>
                    {order.status==='packed' && (
                      <Input placeholder="Tracking number (optional)" value={trackingNo} onChange={e=>setTrackingNo(e.target.value)} style={{marginBottom:10,borderRadius:8}} size="middle"/>
                    )}
                    <Button block loading={advancing} onClick={advance}
                      style={{background:action.color,borderColor:action.color,color:'#fff',fontWeight:700,height:42,borderRadius:10,marginBottom:8}}>
                      ▶ {action.label}
                    </Button>
                  </>
                )}

                {canCancel&&(
                  <Popconfirm title="Cancel this order?" onConfirm={cancel}>
                    <Button danger block style={{borderRadius:10}}>✕ Cancel Order</Button>
                  </Popconfirm>
                )}

                {['delivered','returned'].includes(order.status)&&(
                  <div className={styles.completedMsg}>
                    {order.status==='delivered'?'✅ Order completed':'↩️ Order returned'}
                    {order.actualDelivery&&<div className={styles.deliveredAt}>Delivered {new Date(order.actualDelivery).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>}
                  </div>
                )}
              </div>

              {/* Customer card */}
              <div className={styles.card}>
                <div className={styles.cardTitle}><UserOutlined/> Customer</div>
                {order.customerName ? (
                  <div className={styles.custInfo}>
                    <div className={styles.custName2}>{order.customerName}</div>
                    {order.customerEmail&&<div className={styles.custDetail}>✉ {order.customerEmail}</div>}
                    {order.customerPhone&&<div className={styles.custDetail}>📞 {order.customerPhone}</div>}
                    {order.customerCity&&<div className={styles.custDetail}><EnvironmentOutlined/> {order.customerCity}</div>}
                  </div>
                ) : <div className={styles.walkIn}>Walk-in customer</div>}
                {order.shippingAddress&&<div className={styles.shipAddr}><b>Ship to:</b> {order.shippingAddress}</div>}
              </div>

              {/* Timeline */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>🕐 Order Timeline</div>
                <OrderTimeline timeline={timeline} currentStatus={order.status as OrderStatus}/>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
