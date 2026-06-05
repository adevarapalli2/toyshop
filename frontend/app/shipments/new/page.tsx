'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Steps, Form, Input, Select, DatePicker, Button, InputNumber, Switch, message, AutoComplete } from 'antd';
import { ArrowLeftOutlined, TruckOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { shipmentService, CARRIERS, CARRIER_META } from '@/services/shipmentService';
import { orderService, OrderRow } from '@/services/orderService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import styles from './page.module.css';

const SERVICE_TYPES = ['standard','express','overnight','economy'];

export default function NewShipmentPage() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const [step, setStep] = useState(0);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [carrier, setCarrier] = useState('');
  const [serviceType, setServiceType] = useState('standard');
  const [form1] = Form.useForm();
  const [form2] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!initializing && !user) router.replace('/login'); }, [user, initializing, router]);

  useEffect(() => {
    orderService.list({ status: 'packed' }).then(r => setOrders(r.data.data ?? []));
  }, []);

  const orderOptions = orders.map(o => ({
    value: o.id.toString(),
    label: `${o.orderNumber} — ${o.customerName || 'Walk-in'} (${o.customerCity || ''}) · ₹${parseFloat(o.totalAmount).toLocaleString('en-IN')}`,
    order: o,
  }));

  const submit = async () => {
    if (!selectedOrder || !carrier) { message.error('Please select an order and carrier'); return; }
    const vals2 = form2.getFieldsValue();
    const vals1 = form1.getFieldsValue();
    setSubmitting(true);
    try {
      const r = await shipmentService.create({
        orderId: selectedOrder.id, carrier, serviceType,
        trackingNumber: vals1.trackingNumber || null,
        estimatedDelivery: vals1.estimatedDelivery ? vals1.estimatedDelivery.toISOString() : null,
        weightKg: vals2.weightKg || null, lengthCm: vals2.lengthCm || null,
        widthCm: vals2.widthCm || null, heightCm: vals2.heightCm || null,
        shippingCost: vals2.shippingCost || 0, insuranceValue: vals2.insuranceValue || 0,
        signatureRequired: vals2.signatureRequired || false,
        destinationAddress: vals2.destinationAddress || selectedOrder.shippingAddress || null,
        notes: vals2.notes || null,
      });
      message.success(`Shipment ${r.data.shipment.shipmentNumber} created!`);
      router.push(`/shipments/${r.data.shipment.id}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err.response?.data?.message || 'Failed to create shipment');
    } finally { setSubmitting(false); }
  };

  if (initializing || !user) return null;

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>
        <TopBar title="New Shipment" />
        <div className={styles.content}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={() => router.push('/shipments/list')}><ArrowLeftOutlined /> Shipments</button>
            <div className={styles.pageTitle}>🚚 Create New Shipment</div>
          </div>

          <Steps current={step} className={styles.steps} items={[{ title: 'Order & Carrier' }, { title: 'Package Details & Submit' }]} />

          {/* Step 1 */}
          {step === 0 && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Select Order & Carrier</div>

              {/* Order search */}
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Order to Ship <span className={styles.hint}>(showing packed orders only)</span></div>
                <Select showSearch placeholder="Search packed orders by order number or customer…" style={{ width: '100%' }}
                  options={orderOptions} filterOption={false}
                  onSearch={s => orderService.list({ status: 'packed', search: s }).then(r => setOrders(r.data.data ?? []))}
                  onChange={val => {
                    const o = orders.find(x => x.id === parseInt(val));
                    setSelectedOrder(o || null);
                    if (o) form2.setFieldsValue({ destinationAddress: o.shippingAddress });
                  }} allowClear onClear={() => setSelectedOrder(null)} size="large" />
                {selectedOrder && (
                  <div className={styles.selectedOrder}>
                    <div className={styles.soHeader}><span className={styles.soNum}>{selectedOrder.orderNumber}</span> <span className={styles.soAmt}>₹{parseFloat(selectedOrder.totalAmount).toLocaleString('en-IN')}</span></div>
                    <div className={styles.soDetail}>{selectedOrder.customerName} · {selectedOrder.customerCity} · {selectedOrder.itemCount} item{selectedOrder.itemCount !== 1 ? 's' : ''}</div>
                    {selectedOrder.shippingAddress && <div className={styles.soAddr}>📍 {selectedOrder.shippingAddress}</div>}
                  </div>
                )}
              </div>

              {/* Carrier selection */}
              <div className={styles.section}>
                <div className={styles.sectionLabel}>Select Carrier</div>
                <div className={styles.carrierPills}>
                  {CARRIERS.map(c => {
                    const m = CARRIER_META[c] ?? { color: '#64748b', bg: '#f1f5f9' };
                    return (
                      <button key={c} className={`${styles.carrierPill} ${carrier === c ? styles.carrierPillActive : ''}`}
                        style={carrier === c ? { background: m.color, borderColor: m.color, color: '#fff' } : { borderColor: `${m.color}40`, color: m.color }}
                        onClick={() => setCarrier(c)}>
                        <TruckOutlined /> {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service type + tracking */}
              <Form form={form1} layout="vertical" size="large">
                <div className={styles.row2}>
                  <Form.Item label="Service Type">
                    <Select value={serviceType} onChange={setServiceType} options={SERVICE_TYPES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
                  </Form.Item>
                  <Form.Item name="trackingNumber" label="Tracking Number">
                    <Input placeholder="Carrier-provided tracking #" />
                  </Form.Item>
                </div>
                <Form.Item name="estimatedDelivery" label="Estimated Delivery Date">
                  <DatePicker style={{ width: '100%' }} disabledDate={d => d && d.valueOf() < Date.now()} />
                </Form.Item>
              </Form>

              <div className={styles.stepActions}>
                <Button type="primary" className={styles.nextBtn}
                  disabled={!selectedOrder || !carrier}
                  onClick={() => setStep(1)}>Package Details →</Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 1 && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>Package Details</div>
              <Form form={form2} layout="vertical" size="large" initialValues={{ destinationAddress: selectedOrder?.shippingAddress }}>
                <div className={styles.row3}>
                  <Form.Item name="weightKg" label="Weight (kg)"><InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder="e.g. 1.50" /></Form.Item>
                  <Form.Item name="lengthCm" label="Length (cm)"><InputNumber min={1} style={{ width: '100%' }} placeholder="30" /></Form.Item>
                  <Form.Item name="widthCm" label="Width (cm)"><InputNumber min={1} style={{ width: '100%' }} placeholder="20" /></Form.Item>
                </div>
                <div className={styles.row3}>
                  <Form.Item name="heightCm" label="Height (cm)"><InputNumber min={1} style={{ width: '100%' }} placeholder="15" /></Form.Item>
                  <Form.Item name="shippingCost" label="Shipping Cost (₹)"><InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                  <Form.Item name="insuranceValue" label="Insurance Value (₹)"><InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" /></Form.Item>
                </div>
                <Form.Item name="signatureRequired" label="Signature Required" valuePropName="checked">
                  <Switch checkedChildren="Required" unCheckedChildren="Not required" />
                </Form.Item>
                <Form.Item name="destinationAddress" label="Destination Address">
                  <Input.TextArea rows={2} placeholder="Delivery address" />
                </Form.Item>
                <Form.Item name="notes" label="Shipment Notes">
                  <Input.TextArea rows={2} placeholder="Any special handling instructions…" />
                </Form.Item>
              </Form>

              {/* Summary */}
              <div className={styles.summary}>
                <div className={styles.summaryRow}><span>Order</span><span className={styles.summaryVal}>{selectedOrder?.orderNumber}</span></div>
                <div className={styles.summaryRow}><span>Carrier</span><span className={styles.summaryVal}>{carrier} · {serviceType}</span></div>
                <div className={styles.summaryRow}><span>Customer</span><span className={styles.summaryVal}>{selectedOrder?.customerName}</span></div>
              </div>

              <div className={styles.stepActions}>
                <Button onClick={() => setStep(0)}>← Back</Button>
                <Button type="primary" className={styles.submitBtn} loading={submitting} onClick={submit}>🚚 Create Shipment</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
