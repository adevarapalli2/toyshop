'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Typography, Tag } from 'antd';
import {
  TeamOutlined, UserOutlined, InboxOutlined,
  ShoppingCartOutlined, TruckOutlined, BarChartOutlined,
} from '@ant-design/icons';
import { RootState } from '@/store/index';
import AppNav from '@/components/nav/AppNav';
import styles from './page.module.css';

const { Title, Text } = Typography;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const roleColor: Record<string, string> = { admin: 'purple', manager: 'blue', staff: 'cyan' };

const allTiles = [
  { key: 'users',     href: '/admin/users',  icon: <TeamOutlined />,           label: 'User Management',    desc: 'Manage staff accounts',        color: '#1d4ed8', adminOnly: true },
  { key: 'profile',   href: '/profile',       icon: <UserOutlined />,            label: 'My Profile',         desc: 'View and edit your account',   color: '#7c3aed', adminOnly: false },
  { key: 'inventory', href: '/inventory',     icon: <InboxOutlined />,           label: 'Inventory',          desc: 'Track stock levels',           color: '#059669', adminOnly: false },
  { key: 'orders',    href: '/orders',        icon: <ShoppingCartOutlined />,    label: 'Orders',             desc: 'Manage customer orders',       color: '#d97706', adminOnly: false },
  { key: 'shipments', href: '/shipments',     icon: <TruckOutlined />,           label: 'Shipments',          desc: 'Track deliveries',             color: '#0891b2', adminOnly: false },
  { key: 'reports',   href: '/reports',       icon: <BarChartOutlined />,        label: 'Reports',            desc: 'Analytics and insights',       color: '#dc2626', adminOnly: false },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);

  useEffect(() => {
    if (!initializing && !user) router.replace('/login');
  }, [user, initializing, router]);

  if (initializing || !user) return null;

  const tiles = allTiles.filter(t => !t.adminOnly || user.role === 'admin');

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>

        {/* Welcome banner */}
        <div className={styles.banner}>
          <div className={styles.bannerLeft}>
            <div className={styles.avatarLg}>{user.name.charAt(0).toUpperCase()}</div>
            <div>
              <div className={styles.greeting}>{greeting()},</div>
              <div className={styles.bannerName}>{user.name}</div>
              <div className={styles.bannerMeta}>
                <Tag color={roleColor[user.role]} className={styles.roleTag}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Tag>
                <span className={styles.bannerEmail}>{user.email}</span>
              </div>
            </div>
          </div>
          <div className={styles.bannerRight}>
            <div className={styles.warehouseIllustration}>🏭</div>
            <div className={styles.bannerTagline}>ToyShop Warehouse</div>
          </div>
        </div>

        {/* Section title */}
        <div className={styles.sectionHeader}>
          <Title level={5} className={styles.sectionTitle}>Quick Navigation</Title>
          <Text className={styles.sectionSub}>Select a module to get started</Text>
        </div>

        {/* Navigation tiles */}
        <div className={styles.tilesGrid}>
          {tiles.map(tile => (
            <button
              key={tile.key}
              className={styles.tile}
              onClick={() => router.push(tile.href)}
            >
              <div className={styles.tileIcon} style={{ background: `linear-gradient(135deg, ${tile.color}cc, ${tile.color})` }}>
                {tile.icon}
              </div>
              <div className={styles.tileLabel}>{tile.label}</div>
              <div className={styles.tileDesc}>{tile.desc}</div>
              <div className={styles.tileArrow}>→</div>
            </button>
          ))}
        </div>

      </main>
    </div>
  );
}
