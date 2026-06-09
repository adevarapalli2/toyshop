'use client';

import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Dropdown, Tag, Modal, Form, Input, message, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined, BankOutlined, PlusOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { logout } from '@/store/slices/authSlice';
import { fetchWarehouses, setWarehouse } from '@/store/slices/warehouseSlice';
import { AppDispatch, RootState } from '@/store/index';
import { warehouseService } from '@/services/warehouseService';
import styles from './TopBar.module.css';

const roleColor: Record<string, string> = { admin: 'purple', manager: 'blue', staff: 'cyan' };

interface Props { title?: string; }

export default function TopBar({ title }: Props) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const { list: warehouses, selected: selectedWarehouse } = useSelector((s: RootState) => s.warehouse);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [form] = Form.useForm();

  if (!user) return null;

  const initials = user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleAddWarehouse = async (values: { name: string; code: string; description?: string }) => {
    setAddLoading(true);
    try {
      const res = await warehouseService.create({ ...values, code: values.code.toUpperCase() });
      dispatch(fetchWarehouses());
      dispatch(setWarehouse(res.data.warehouse.name));
      message.success(`Warehouse "${res.data.warehouse.name}" created`);
      setAddOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || 'Failed to create warehouse');
    } finally { setAddLoading(false); }
  };

  const items: MenuProps['items'] = [
    {
      key: 'info',
      label: (
        <div className={styles.dropdownInfo}>
          <div className={styles.dropdownName}>{user.name}</div>
          <div className={styles.dropdownEmail}>{user.email}</div>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    { key: 'profile', icon: <UserOutlined />, label: 'My Profile', onClick: () => router.push('/profile') },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings', onClick: () => router.push('/settings') },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: <span style={{ color: '#ef4444' }}>Logout</span>,
      onClick: () => { dispatch(logout()); router.push('/login'); },
    },
  ];

  return (
    <div className={styles.topBar}>
      {/* Left — page title */}
      <div className={styles.left}>
        {title && <span className={styles.title}>{title}</span>}
      </div>

      {/* Centre — warehouse switcher */}
      <div className={styles.center}>
        <div className={styles.whSwitcher}>
          <BankOutlined className={styles.whIcon} />
          <div className={styles.whPills}>
            {warehouses.map(wh => (
              <button
                key={wh.id}
                className={`${styles.whPill} ${selectedWarehouse === wh.name ? styles.whPillActive : ''}`}
                onClick={() => dispatch(setWarehouse(wh.name))}
              >
                <span className={styles.whCode}>{wh.code}</span>
                <span className={styles.whName}>{wh.name}</span>
              </button>
            ))}
          </div>
          {user.role === 'admin' && (
            <Tooltip title="Add Warehouse" placement="bottom">
              <button className={styles.whAddBtn} onClick={() => setAddOpen(true)}>
                <PlusOutlined />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Right — profile */}
      <div className={styles.right}>
        <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']} arrow>
          <button className={styles.profileBtn}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <Tag color={roleColor[user.role]} className={styles.roleTag}>
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </Tag>
            </div>
            <span className={styles.chevron}>▾</span>
          </button>
        </Dropdown>
      </div>

      {/* Add Warehouse Modal */}
      <Modal
        title="Add Warehouse"
        open={addOpen}
        onOk={() => form.submit()}
        onCancel={() => { setAddOpen(false); form.resetFields(); }}
        confirmLoading={addLoading}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={handleAddWarehouse}>
          <Form.Item name="name" label="Warehouse Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Saraswati" />
          </Form.Item>
          <Form.Item name="code" label="Code (max 6 chars)" rules={[{ required: true }, { max: 6 }]} normalize={(v: string) => v.toUpperCase()}>
            <Input placeholder="e.g. SA" maxLength={6} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
