'use client';

import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import { PlusOutlined, BankOutlined } from '@ant-design/icons';
import { productService } from '@/services/inventoryService';
import styles from './Modal.module.css';

const CATEGORIES = [
  'action-figures','board-games','building-sets','electronic',
  'outdoor','arts-crafts','puzzles','dolls','remote-control','plush',
];

interface Props { open: boolean; warehouse: string; onClose: () => void; onSuccess: () => void; }

export default function AddProductModal({ open, warehouse, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();

  const onFinish = async (v: Record<string, unknown>) => {
    try {
      await productService.create({ ...v, warehouse });
      message.success(`Product "${v.name}" created`);
      form.resetFields(); onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || 'Failed to create product');
    }
  };

  return (
    <Modal open={open} onCancel={() => { form.resetFields(); onClose(); }} footer={null}
      title={<div className={styles.title}><span className={styles.iconWrap} style={{ background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' }}><PlusOutlined /></span>Add New Product</div>}
      width={560} centered>
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 10px', marginBottom:8, background:'rgba(37,99,235,0.08)', borderRadius:6, border:'1px solid rgba(37,99,235,0.2)', fontSize:13, color:'#60a5fa' }}>
        <BankOutlined /> Adding to warehouse: <strong style={{ color:'#93c5fd' }}>{warehouse}</strong>
      </div>
      <Form form={form} layout="vertical" onFinish={onFinish} size="large" style={{ marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item name="sku" label="SKU" rules={[{ required: true, message: 'Enter SKU' }]}>
            <Input placeholder="e.g. TOY-021" style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select placeholder="Select category">
              {CATEGORIES.map(c => <Select.Option key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Select.Option>)}
            </Select>
          </Form.Item>
        </div>
        <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
          <Input placeholder="Full product name" />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 16px' }}>
          <Form.Item name="costPrice" label="Cost Price (₹)">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="sellPrice" label="Sell Price (₹)">
            <InputNumber min={0} precision={2} style={{ width: '100%' }} placeholder="0.00" />
          </Form.Item>
          <Form.Item name="unit" label="Unit">
            <Select defaultValue="piece">
              {['piece','set','pack','box'].map(u => <Select.Option key={u} value={u}>{u}</Select.Option>)}
            </Select>
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0 12px' }}>
          <Form.Item name="initialQty" label="Initial Qty">
            <InputNumber min={0} style={{ width: '100%' }} defaultValue={0} />
          </Form.Item>
          <Form.Item name="minStock" label="Min Stock">
            <InputNumber min={0} style={{ width: '100%' }} defaultValue={5} />
          </Form.Item>
          <Form.Item name="maxStock" label="Max Stock">
            <InputNumber min={1} style={{ width: '100%' }} defaultValue={100} />
          </Form.Item>
          <Form.Item name="warehouseZone" label="Zone">
            <Select defaultValue="A">
              {['A','B','C'].map(z => <Select.Option key={z} value={z}>{z}</Select.Option>)}
            </Select>
          </Form.Item>
        </div>
        <Form.Item name="binLocation" label="Bin Location">
          <Input placeholder="e.g. A1-05" />
        </Form.Item>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={() => { form.resetFields(); onClose(); }}>Cancel</button>
          <button type="submit" className={styles.submitBtn}>Create Product</button>
        </div>
      </Form>
    </Modal>
  );
}
