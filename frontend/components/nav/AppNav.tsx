'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Tooltip } from 'antd';
import {
  DashboardOutlined, TeamOutlined, InboxOutlined, ShoppingCartOutlined,
  TruckOutlined, BarChartOutlined, SettingOutlined, LogoutOutlined,
  MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { logout } from '@/store/slices/authSlice';
import { AppDispatch, RootState } from '@/store/index';
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
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

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
    </nav>
  );
}
