'use client';

import { useState } from 'react';
import { Modal, Form, Input, Select, InputNumber, message } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { inventoryService, MovementType, ProductRow } from '@/services/inventoryService';
import styles from './Modal.module.css';

interface Props {
  product: ProductRow | null; open: boolean; warehouse: string;
  onClose: () => void; onSuccess: () => void;
}

const typeColors: Record<string, string> = {
  IN: '#10b981', OUT: '#ef4444', ADJUSTMENT: '#3b82f6',
  RETURN: '#8b5cf6', TRANSFER: '#f97316',
};

export default function StockAdjustModal({ product, open, warehouse, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const onFinish = async (v: { movementType: MovementType; quantity: number; referenceNo?: string; notes?: string }) => {
    if (!product) return;
    setLoading(true);
    try {
      const res = await inventoryService.adjust({ productId: product.id, warehouse, ...v });
      message.success(`Stock updated: ${res.data.quantityBefore} → ${res.data.quantityAfter}`);
      form.resetFields();
      onSuccess();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || 'Adjustment failed');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onCancel={() => { form.resetFields(); onClose(); }} footer={null}
      title={<div className={styles.title}><span className={styles.iconWrap} style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}><SwapOutlined /></span>Adjust Stock — {product?.name}</div>}
      width={480} centered>
      <div className={styles.currentStock}>
        Current stock: <strong>{product?.quantity ?? 0}</strong> {product?.unit ?? 'pcs'} &nbsp;|&nbsp; Available: <strong>{product?.available ?? 0}</strong>
      </div>
      <Form form={form} layout="vertical" onFinish={onFinish} size="large" style={{ marginTop: 16 }}>
        <Form.Item name="movementType" label="Movement Type" rules={[{ required: true }]} initialValue="ADJUSTMENT">
          <Select>
            {(['IN','OUT','ADJUSTMENT','RETURN','TRANSFER'] as MovementType[]).map(t => (
              <Select.Option key={t} value={t}>
                <span style={{ color: typeColors[t], fontWeight: 700 }}>● {t}</span>
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="quantity" label="Quantity" rules={[{ required: true }, { type: 'number', min: 1 }]}>
          <InputNumber min={1} style={{ width: '100%' }} placeholder="Enter quantity" />
        </Form.Item>
        <Form.Item name="referenceNo" label="Reference No. (optional)">
          <Input placeholder="e.g. PO-2026-001" />
        </Form.Item>
        <Form.Item name="notes" label="Notes (optional)">
          <Input.TextArea rows={2} placeholder="Reason for adjustment" />
        </Form.Item>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={() => { form.resetFields(); onClose(); }}>Cancel</button>
          <button type="submit" className={styles.submitBtn} disabled={loading}>{loading ? 'Saving...' : 'Apply Adjustment'}</button>
        </div>
      </Form>
    </Modal>
  );
}
