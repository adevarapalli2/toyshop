'use client';

import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Dropdown, Tag } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, SettingOutlined } from '@ant-design/icons';
import { logout } from '@/store/slices/authSlice';
import { AppDispatch, RootState } from '@/store/index';
import styles from './TopBar.module.css';

const roleColor: Record<string, string> = { admin: 'purple', manager: 'blue', staff: 'cyan' };

interface Props {
  title?: string;
}

export default function TopBar({ title }: Props) {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);

  if (!user) return null;

  const initials = user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

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
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => router.push('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => router.push('/settings'),
    },
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
      <div className={styles.left}>
        {title && <span className={styles.title}>{title}</span>}
      </div>

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
    </div>
  );
}
