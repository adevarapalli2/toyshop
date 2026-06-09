'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Tooltip, Modal, Form, Input, message } from 'antd';
import { BankOutlined, PlusOutlined } from '@ant-design/icons';
import {
  DashboardOutlined, TeamOutlined, InboxOutlined, ShoppingCartOutlined,
  TruckOutlined, BarChartOutlined, SettingOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { logout } from '@/store/slices/authSlice';
import { fetchWarehouses, initWarehouse, setWarehouse } from '@/store/slices/warehouseSlice';
import { AppDispatch, RootState } from '@/store/index';
import { warehouseService } from '@/services/warehouseService';
import styles from './AppNav.module.css';

const navItems = [
  { key: '/dashboard',    icon: <DashboardOutlined />,     label: 'Dashboard' },
  { key: '/admin/users',  icon: <TeamOutlined />,           label: 'Users' },
  { key: '/inventory',    icon: <InboxOutlined />,          label: 'Inventory' },
  { key: '/orders',       icon: <ShoppingCartOutlined />,   label: 'Orders' },
  { key: '/shipments',    icon: <TruckOutlined />,          label: 'Shipments' },
  { key: '/reports',      icon: <BarChartOutlined />,       label: 'Reports' },
  { key: '/settings',     icon: <SettingOutlined />,        label: 'Settings' },
];

export default function AppNav() {
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState('');
  const [addWhOpen, setAddWhOpen] = useState(false);
  const [addWhLoading, setAddWhLoading] = useState(false);
  const [form] = Form.useForm();

  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const { list: warehouses, selected: selectedWarehouse } = useSelector((s: RootState) => s.warehouse);

  useEffect(() => {
    dispatch(initWarehouse());
    dispatch(fetchWarehouses());
  }, [dispatch]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--nav-width', collapsed ? '64px' : '220px');
  }, [collapsed]);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const handleAddWarehouse = async (values: { name: string; code: string; description?: string }) => {
    setAddWhLoading(true);
    try {
      const res = await warehouseService.create({ ...values, code: values.code.toUpperCase() });
      dispatch(fetchWarehouses());
      dispatch(setWarehouse(res.data.warehouse.name));
      message.success(`Warehouse "${res.data.warehouse.name}" added`);
      setAddWhOpen(false);
      form.resetFields();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || 'Failed to add warehouse');
    } finally {
      setAddWhLoading(false);
    }
  };

  const activeCode = warehouses.find(w => w.name === selectedWarehouse)?.code ?? selectedWarehouse.slice(0, 2).toUpperCase();

  return (
    <nav className={`${styles.nav} ${collapsed ? styles.collapsed : ''}`}>
      {/* Brand */}
      <div className={styles.brand} onClick={() => router.push('/dashboard')}>
        <div className={styles.brandIcon}>🏭</div>
        {!collapsed && (
          <div className={styles.brandText}>
            <div className={styles.brandName}>ToyShop WMS</div>
            <div className={styles.brandSub}>Warehouse</div>
          </div>
        )}
      </div>

      <button className={styles.collapseBtn} onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>

      {/* Warehouse Switcher */}
      {collapsed ? (
        <Tooltip title={`Warehouse: ${selectedWarehouse}`} placement="right">
          <div className={styles.whCollapsed}>
            <BankOutlined />
            <span>{activeCode}</span>
          </div>
        </Tooltip>
      ) : (
        <div className={styles.warehouseSwitcher}>
          <div className={styles.whLabel}><BankOutlined /> Warehouse</div>
          <div className={styles.whToggle}>
            {warehouses.map(wh => (
              <button
                key={wh.id}
                className={`${styles.whBtn} ${selectedWarehouse === wh.name ? styles.whBtnActive : ''}`}
                onClick={() => dispatch(setWarehouse(wh.name))}
              >
                {wh.name}
              </button>
            ))}
          </div>
          {user?.role === 'admin' && (
            <button className={styles.whAddBtn} onClick={() => setAddWhOpen(true)}>
              <PlusOutlined /> Add Warehouse
            </button>
          )}
        </div>
      )}

      {/* Nav items */}
      <div className={styles.navList}>
        {navItems.map(item => {
          const active = pathname.startsWith(item.key);
          return (
            <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
              <button
                className={`${styles.navItem} ${active ? styles.active : ''}`}
                onClick={() => router.push(item.key)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Bottom */}
      <div className={styles.bottom}>
        {!collapsed && user && (
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>{user.name.charAt(0).toUpperCase()}</div>
            <div className={styles.userDetails}>
              <div className={styles.userName}>{user.name}</div>
              <div className={styles.userRole}>{user.role}</div>
            </div>
          </div>
        )}
        {!collapsed && <div className={styles.clock}>🕐 {time}</div>}
        <Tooltip title={collapsed ? 'Logout' : ''} placement="right">
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogoutOutlined />
            {!collapsed && <span>Logout</span>}
          </button>
        </Tooltip>
      </div>

      {/* Add Warehouse Modal */}
      <Modal
        title="Add Warehouse"
        open={addWhOpen}
        onOk={() => form.submit()}
        onCancel={() => { setAddWhOpen(false); form.resetFields(); }}
        confirmLoading={addWhLoading}
        okText="Create"
      >
        <Form form={form} layout="vertical" onFinish={handleAddWarehouse}>
          <Form.Item name="name" label="Warehouse Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input placeholder="e.g. Saraswati" />
          </Form.Item>
          <Form.Item
            name="code"
            label="Code"
            rules={[
              { required: true, message: 'Code is required' },
              { max: 6, message: 'Max 6 characters' },
            ]}
            normalize={(v: string) => v.toUpperCase()}
          >
            <Input placeholder="e.g. SA" maxLength={6} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="description" label="Description (optional)">
            <Input.TextArea rows={2} placeholder="Brief description" />
          </Form.Item>
        </Form>
      </Modal>
    </nav>
  );
}
