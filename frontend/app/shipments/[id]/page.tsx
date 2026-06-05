'use client';
import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Button, Input, message, Tag, Popconfirm } from 'antd';
import { ArrowLeftOutlined, CopyOutlined, UserOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { shipmentService, ShipmentDetail, ShipmentEvent, ShipmentItem, NEXT_ACTION, STATUS_META, ShipStatus, EVENT_ICONS } from '@/services/shipmentService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import ShipmentStatusBadge from '@/components/shipments/ShipmentStatusBadge';
import CarrierBadge from '@/components/shipments/CarrierBadge';
import TrackingProgress from '@/components/shipments/TrackingProgress';
import TrackingTimeline from '@/components/shipments/TrackingTimeline';
import styles from './page.module.css';

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [evtLocation, setEvtLocation] = useState('');
  const [evtDesc, setEvtDesc] = useState('');
  const [addingEvt, setAddingEvt] = useState(false);

  useEffect(() => { if (!initializing && !user) router.replace('/login'); }, [user, initializing, router]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await shipmentService.getById(parseInt(id));
      setShipment(r.data.shipment); setEvents(r.data.events); setItems(r.data.items);
    } catch { message.error('Failed to load shipment'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(); }, [user, id]); // eslint-disable-line

  const advance = async (next: ShipStatus) => {
    if (!shipment) return;
    setAdvancing(true);
    try {
      await shipmentService.updateStatus(shipment.id, next, undefined, undefined);
      message.success(`Shipment marked as ${STATUS_META[next].label}`);
      load();
    } catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; message.error(err.response?.data?.message || 'Failed'); }
    finally { setAdvancing(false); }
  };

  const addEvent = async () => {
    if (!shipment || !evtDesc.trim()) return;
    setAddingEvt(true);
    try {
      await shipmentService.addEvent(shipment.id, { eventType: 'location_scan', location: evtLocation, description: evtDesc });
      message.success('Tracking event added');
      setEvtLocation(''); setEvtDesc('');
      load();
    } catch { message.error('Failed'); }
    finally { setAddingEvt(false); }
  };

  if (initializing || !user || loading) return (
    <div className={styles.root}><AppNav /><main className={styles.main}><TopBar /><div className={styles.loading}>Loading shipment…</div></main></div>
  );
  if (!shipment) return null;

  const actions = NEXT_ACTION[shipment.status as ShipStatus] ?? [];
  const isDelayed = shipment.estimatedDelivery && new Date(shipment.estimatedDelivery) < new Date() && shipment.status !== 'delivered';

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>
        <TopBar title={shipment.shipmentNumber} />
        <div className={styles.content}>

          {/* Header */}
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={() => router.push('/shipments/list')}><ArrowLeftOutlined /> Shipments</button>
            <div className={styles.headerInfo}>
              <h2 className={styles.shipNum}>{shipment.shipmentNumber}</h2>
              <CarrierBadge carrier={shipment.carrier} />
              <ShipmentStatusBadge status={shipment.status as ShipStatus} />
              {isDelayed && <span className={styles.delayedBadge}>⚠️ Delayed</span>}
            </div>
            <div className={styles.trackingHeader}>
              <span className={styles.trackLabel}>Tracking:</span>
              <span className={styles.trackNum}>{shipment.trackingNumber || 'N/A'}</span>
              {shipment.trackingNumber && (
                <button className={styles.copyBtn} onClick={() => { navigator.clipboard.writeText(shipment.trackingNumber); message.success('Copied!'); }}>
                  <CopyOutlined /> Copy
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className={styles.progressCard}>
            <TrackingProgress status={shipment.status as ShipStatus} />
          </div>

          <div className={styles.layout}>
            {/* Left col */}
            <div className={styles.leftCol}>

              {/* FedEx-style tracking timeline */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>📍 Tracking Events</div>
                <TrackingTimeline events={events} />
              </div>

              {/* Package details */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>📦 Package Details</div>
                <div className={styles.pkgGrid}>
                  <div className={styles.pkgItem}><span className={styles.pkgLabel}>Carrier</span><CarrierBadge carrier={shipment.carrier} /></div>
                  <div className={styles.pkgItem}><span className={styles.pkgLabel}>Service</span><span className={styles.pkgVal}>{shipment.serviceType}</span></div>
                  <div className={styles.pkgItem}><span className={styles.pkgLabel}>Weight</span><span className={styles.pkgVal}>{shipment.weightKg ? `${shipment.weightKg} kg` : '—'}</span></div>
                  <div className={styles.pkgItem}><span className={styles.pkgLabel}>Dimensions</span><span className={styles.pkgVal}>{shipment.lengthCm ? `${shipment.lengthCm}×${shipment.widthCm}×${shipment.heightCm} cm` : '—'}</span></div>
                  <div className={styles.pkgItem}><span className={styles.pkgLabel}>Shipping Cost</span><span className={styles.pkgVal}>₹{parseFloat(shipment.shippingCost || '0').toLocaleString('en-IN')}</span></div>
                  <div className={styles.pkgItem}><span className={styles.pkgLabel}>Insurance</span><span className={styles.pkgVal}>{shipment.insuranceValue && parseFloat(shipment.insuranceValue) > 0 ? `₹${parseFloat(shipment.insuranceValue).toLocaleString('en-IN')}` : 'None'}</span></div>
                  <div className={styles.pkgItem}><span className={styles.pkgLabel}>Signature Req.</span><span className={styles.pkgVal}>{shipment.signatureRequired ? '✅ Yes' : 'No'}</span></div>
                  <div className={styles.pkgItem}><span className={styles.pkgLabel}>Est. Delivery</span><span className={`${styles.pkgVal} ${isDelayed ? styles.overdueVal : ''}`}>{shipment.estimatedDelivery ? new Date(shipment.estimatedDelivery).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '—'}</span></div>
                  {shipment.actualDelivery && <div className={styles.pkgItem}><span className={styles.pkgLabel}>Delivered</span><span className={styles.pkgVal} style={{ color: '#059669', fontWeight: 700 }}>{new Date(shipment.actualDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>}
                </div>
                <div className={styles.addresses}>
                  <div className={styles.addrBox}><div className={styles.addrLabel}><EnvironmentOutlined /> From</div><div className={styles.addrVal}>{shipment.originAddress}</div></div>
                  <div className={styles.addrArrow}>→</div>
                  <div className={styles.addrBox}><div className={styles.addrLabel}><EnvironmentOutlined /> To</div><div className={styles.addrVal}>{shipment.destinationAddress}</div></div>
                </div>
              </div>

              {/* Items */}
              {items.length > 0 && (
                <div className={styles.card}>
                  <div className={styles.cardTitle}>🧸 Items in Shipment</div>
                  <div className={styles.itemsTable}>
                    <div className={styles.itemHead}><span>Product</span><span>Qty</span></div>
                    {items.map(item => (
                      <div key={item.id} className={styles.itemRow}>
                        <div><span className={styles.sku}>{item.productSku}</span> <span className={styles.prodName}>{item.productName}</span><Tag color="default" style={{ fontSize: 10, marginLeft: 4 }}>{item.category}</Tag></div>
                        <span className={styles.qty}>{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right col */}
            <div className={styles.rightCol}>

              {/* Action card */}
              <div className={styles.actionCard}>
                <div className={styles.currentStatus}>
                  <span className={styles.statusLabel}>Status</span>
                  <ShipmentStatusBadge status={shipment.status as ShipStatus} />
                </div>

                {actions.length > 0 && (
                  <div className={styles.actionBtns}>
                    {actions.map(action => (
                      <Button key={action.next} block loading={advancing} onClick={() => advance(action.next)}
                        danger={action.danger}
                        style={!action.danger ? { background: action.color, borderColor: action.color, color: '#fff', fontWeight: 700, height: 42, borderRadius: 10, marginBottom: 8 } : { height: 42, borderRadius: 10, marginBottom: 8 }}>
                        {STATUS_META[action.next]?.icon} {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                {['delivered', 'returned'].includes(shipment.status) && (
                  <div className={styles.completedMsg}>
                    {shipment.status === 'delivered' ? '✅ Successfully Delivered' : '↩️ Package Returned'}
                    {shipment.actualDelivery && <div className={styles.deliveredAt}>{new Date(shipment.actualDelivery).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>}
                  </div>
                )}

                <div className={styles.divider} />

                {/* Quick event */}
                <div className={styles.quickEvt}>
                  <div className={styles.quickTitle}>➕ Add Tracking Event</div>
                  <Input placeholder="Location (e.g. Mumbai Hub)" value={evtLocation} onChange={e => setEvtLocation(e.target.value)} size="middle" style={{ marginBottom: 8, borderRadius: 8 }} />
                  <Input.TextArea rows={2} placeholder="Event description" value={evtDesc} onChange={e => setEvtDesc(e.target.value)} style={{ borderRadius: 8, marginBottom: 8 }} />
                  <Button block loading={addingEvt} onClick={addEvent} disabled={!evtDesc.trim()} style={{ borderRadius: 8, fontWeight: 600 }}>Add Event</Button>
                </div>
              </div>

              {/* Linked order */}
              <div className={styles.card}>
                <div className={styles.cardTitle}>🛒 Linked Order</div>
                <div className={styles.orderInfo}>
                  <button className={styles.orderLink} onClick={() => router.push(`/orders/${shipment.orderId}`)}>{shipment.orderNumber}</button>
                  <div className={styles.orderDetail}><Tag color="blue">{shipment.orderStatus}</Tag> ₹{parseFloat(shipment.orderTotal || '0').toLocaleString('en-IN')}</div>
                </div>
              </div>

              {/* Recipient */}
              {shipment.customerName && (
                <div className={styles.card}>
                  <div className={styles.cardTitle}><UserOutlined /> Recipient</div>
                  <div className={styles.recipientInfo}>
                    <div className={styles.recipientName}>{shipment.customerName}</div>
                    {shipment.customerPhone && <div className={styles.recipientDetail}>📞 {shipment.customerPhone}</div>}
                    {shipment.customerEmail && <div className={styles.recipientDetail}>✉ {shipment.customerEmail}</div>}
                    {shipment.customerCity && <div className={styles.recipientDetail}><EnvironmentOutlined /> {shipment.customerCity}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
