'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Steps, Form, Input, Select, DatePicker, Button, message, AutoComplete, InputNumber, Tag, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { RootState } from '@/store/index';
import { orderService, customerService, CustomerRow } from '@/services/orderService';
import { productService, ProductRow } from '@/services/inventoryService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import StockBadge from '@/components/inventory/StockBadge';
import type { StockStatus } from '@/services/inventoryService';
import styles from './page.module.css';

function ss(qty:number,min:number,max:number):StockStatus{ if(qty===0)return'out_of_stock';if(qty<=min)return'low_stock';if(qty>max)return'overstock';return'in_stock'; }

interface LineItem { productId:number; productName:string; productSku:string; quantity:number; unitPrice:number; currentStock:number; minStock:number; maxStock:number; }

export default function NewOrderPage() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);
  const [step, setStep] = useState(0);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow|null>(null);
  const [customerForm] = Form.useForm();
  const [items, setItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [priority, setPriority] = useState<'normal'|'high'|'urgent'>('normal');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(()=>{if(!initializing&&!user)router.replace('/login');},[user,initializing,router]);

  useEffect(()=>{
    customerService.list().then(r=>setCustomers(r.data.data??[]));
    productService.list().then(r=>setProducts(r.data.data??[]));
  },[]);

  const custOptions = customers.map(c=>({value:c.id.toString(),label:`${c.name} — ${c.city||''}`,customer:c}));
  const prodOptions = products
    .filter(p=>p.isActive&&(!productSearch||(p.name.toLowerCase().includes(productSearch.toLowerCase())||p.sku.toLowerCase().includes(productSearch.toLowerCase()))))
    .map(p=>({value:p.id.toString(),label:`${p.sku} — ${p.name} (${p.quantity} in stock)`,product:p}));

  const addItem = (prodId:string) => {
    const prod = products.find(p=>p.id===parseInt(prodId));
    if(!prod)return;
    if(items.find(i=>i.productId===prod.id)){message.warning('Product already added');return;}
    setItems(prev=>[...prev,{productId:prod.id,productName:prod.name,productSku:prod.sku,quantity:1,unitPrice:parseFloat(prod.sellPrice),currentStock:prod.quantity,minStock:prod.minStock,maxStock:prod.maxStock}]);
    setProductSearch('');
  };

  const updateQty = (productId:number, qty:number) => setItems(prev=>prev.map(i=>i.productId===productId?{...i,quantity:Math.max(1,qty)}:i));
  const removeItem = (productId:number) => setItems(prev=>prev.filter(i=>i.productId!==productId));

  const subtotal = items.reduce((s,i)=>s+i.quantity*i.unitPrice,0);
  const tax = subtotal*0.18;
  const total = subtotal+tax;

  const submit = async() => {
    if(!items.length){message.error('Add at least one product');return;}
    const custValues = customerForm.getFieldsValue();
    setSubmitting(true);
    try {
      const body = {
        customerId: selectedCustomer?.id||null,
        priority,
        notes,
        shippingAddress: custValues.shippingAddress||selectedCustomer?.address||null,
        items: items.map(i=>({productId:i.productId,quantity:i.quantity})),
      };
      const r = await orderService.create(body);
      message.success(`Order ${r.data.order.orderNumber} created!`);
      router.push(`/orders/${r.data.order.id}`);
    } catch(e:unknown){
      const err=e as{response?:{data?:{message?:string}}};
      message.error(err.response?.data?.message||'Failed to create order');
    } finally { setSubmitting(false); }
  };

  if(initializing||!user)return null;

  return (
    <div className={styles.root}>
      <AppNav/>
      <main className={styles.main}>
        <TopBar title="New Order"/>
        <div className={styles.content}>
          <div className={styles.header}>
            <button className={styles.backBtn} onClick={()=>router.push('/orders/list')}><ArrowLeftOutlined/> Orders</button>
            <div className={styles.pageTitle}>🛒 Create New Order</div>
          </div>

          <Steps current={step} className={styles.steps} items={[{title:'Customer'},{title:'Products'},{title:'Review & Submit'}]}/>

          {/* Step 1 — Customer */}
          {step===0&&(
            <div className={styles.card}>
              <div className={styles.cardTitle}>Select or Enter Customer</div>
              <div className={styles.custSearch}>
                <Select showSearch placeholder="Search existing customer by name or email…" style={{width:'100%'}}
                  options={custOptions} filterOption={false}
                  onSearch={s=>customerService.list({search:s}).then(r=>setCustomers(r.data.data??[]))}
                  onChange={(val)=>{const c=customers.find(x=>x.id===parseInt(val));setSelectedCustomer(c||null);if(c)customerForm.setFieldsValue({shippingAddress:c.address});}}
                  allowClear onClear={()=>setSelectedCustomer(null)}/>
              </div>
              {selectedCustomer&&(
                <div className={styles.selectedCust}>
                  <div className={styles.custName}>{selectedCustomer.name}</div>
                  <div className={styles.custDetail}>{selectedCustomer.email} · {selectedCustomer.phone}</div>
                  <div className={styles.custDetail}>{selectedCustomer.city}, {selectedCustomer.state}</div>
                </div>
              )}
              <Form form={customerForm} layout="vertical" style={{marginTop:16}}>
                <Form.Item name="shippingAddress" label="Shipping Address">
                  <Input.TextArea rows={2} placeholder="Leave blank to use customer's address"/>
                </Form.Item>
              </Form>
              <div className={styles.priorityRow}>
                <label className={styles.priorityLabel}>Priority:</label>
                {(['normal','high','urgent'] as const).map(p=>(
                  <button key={p} className={`${styles.pBtn} ${priority===p?styles.pBtnActive:''}`}
                    style={priority===p?{background:p==='urgent'?'#dc2626':p==='high'?'#d97706':'#059669',color:'#fff',borderColor:'transparent'}:{}}
                    onClick={()=>setPriority(p)}>
                    {p==='urgent'?'🔴':p==='high'?'🟠':'🟢'} {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                ))}
              </div>
              <Form.Item label="Order Notes" style={{marginTop:8}}>
                <Input.TextArea rows={2} placeholder="Any special instructions…" value={notes} onChange={e=>setNotes(e.target.value)}/>
              </Form.Item>
              <div className={styles.stepActions}>
                <Button type="primary" className={styles.nextBtn} onClick={()=>setStep(1)}>Next: Add Products →</Button>
              </div>
            </div>
          )}

          {/* Step 2 — Products */}
          {step===1&&(
            <div className={styles.card}>
              <div className={styles.cardTitle}>Add Products to Order</div>
              <AutoComplete options={prodOptions} style={{width:'100%'}} value={productSearch}
                onChange={setProductSearch} onSelect={addItem}
                filterOption={false}
                onSearch={s=>setProductSearch(s)}>
                <Input.Search prefix={<PlusOutlined/>} placeholder="Search by SKU or product name to add…" enterButton="Add" onSearch={v=>{const opt=prodOptions.find(o=>o.label.toLowerCase().includes(v.toLowerCase()));if(opt)addItem(opt.value);}}/>
              </AutoComplete>

              {items.length===0&&<div className={styles.emptyItems}>No products added yet. Search above to add items.</div>}

              {items.length>0&&(
                <div className={styles.itemsWrap}>
                  <div className={styles.itemsThead}><span>Product</span><span>Stock</span><span>Qty</span><span>Unit Price</span><span>Total</span><span></span></div>
                  {items.map(item=>(
                    <div key={item.productId} className={`${styles.itemRow} ${item.quantity>item.currentStock?styles.overStock:''}`}>
                      <div>
                        <span className={styles.sku}>{item.productSku}</span>
                        <div className={styles.prodName}>{item.productName}</div>
                        {item.quantity>item.currentStock&&<div className={styles.stockWarn}>⚠️ Quantity exceeds available stock</div>}
                      </div>
                      <StockBadge qty={item.currentStock} min={item.minStock} max={item.maxStock} status={ss(item.currentStock,item.minStock,item.maxStock)} showBar={false}/>
                      <InputNumber min={1} value={item.quantity} onChange={v=>updateQty(item.productId,v||1)} style={{width:70}}/>
                      <span className={styles.price}>₹{item.unitPrice.toLocaleString('en-IN')}</span>
                      <span className={styles.lineTotal}>₹{(item.quantity*item.unitPrice).toLocaleString('en-IN')}</span>
                      <Button size="small" danger icon={<DeleteOutlined/>} onClick={()=>removeItem(item.productId)}/>
                    </div>
                  ))}
                  <div className={styles.runningTotal}>
                    <span>Subtotal: <b>₹{subtotal.toLocaleString('en-IN',{maximumFractionDigits:2})}</b></span>
                    <span>Tax (18%): <b>₹{tax.toLocaleString('en-IN',{maximumFractionDigits:2})}</b></span>
                    <span className={styles.grandT}>Total: <b>₹{total.toLocaleString('en-IN',{maximumFractionDigits:2})}</b></span>
                  </div>
                </div>
              )}

              <div className={styles.stepActions}>
                <Button onClick={()=>setStep(0)}>← Back</Button>
                <Button type="primary" className={styles.nextBtn} disabled={!items.length} onClick={()=>setStep(2)}>Review Order →</Button>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step===2&&(
            <div className={styles.card}>
              <div className={styles.cardTitle}>Review & Confirm Order</div>
              <div className={styles.reviewGrid}>
                <div>
                  <div className={styles.reviewSection}>Customer</div>
                  <div className={styles.reviewVal}>{selectedCustomer?.name||'Walk-in'}</div>
                  {selectedCustomer&&<div className={styles.reviewSub}>{selectedCustomer.city}</div>}
                </div>
                <div>
                  <div className={styles.reviewSection}>Priority</div>
                  <div className={styles.reviewVal}>{priority.charAt(0).toUpperCase()+priority.slice(1)}</div>
                </div>
                <div>
                  <div className={styles.reviewSection}>Items</div>
                  <div className={styles.reviewVal}>{items.length} product{items.length!==1?'s':''}</div>
                </div>
                <div>
                  <div className={styles.reviewSection}>Order Total</div>
                  <div className={styles.reviewVal} style={{color:'#059669'}}>₹{total.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
                </div>
              </div>
              <div className={styles.reviewItems}>
                {items.map(i=>(
                  <div key={i.productId} className={styles.reviewItem}>
                    <span className={styles.sku}>{i.productSku}</span>
                    <span className={styles.prodName}>{i.productName}</span>
                    <span>×{i.quantity}</span>
                    <span className={styles.lineTotal}>₹{(i.quantity*i.unitPrice).toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
                  </div>
                ))}
              </div>
              <div className={styles.stepActions}>
                <Button onClick={()=>setStep(1)}>← Back</Button>
                <Button type="primary" className={styles.submitBtn} loading={submitting} onClick={submit}>✓ Confirm & Place Order</Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
