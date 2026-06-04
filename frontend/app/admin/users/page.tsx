'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import {
  Table, Button, Tag, Input, Select, Popconfirm,
  message, Tooltip, Space, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined, SearchOutlined, EditOutlined,
  StopOutlined, ReloadOutlined, TeamOutlined,
  UserOutlined, CrownOutlined, SafetyOutlined,
} from '@ant-design/icons';
import { RootState } from '@/store/index';
import { userService, UserRow, UserSummary } from '@/services/userService';
import AppNav from '@/components/nav/AppNav';
import AddUserModal from '@/components/admin/AddUserModal';
import EditUserModal from '@/components/admin/EditUserModal';
import styles from './page.module.css';

const { Title, Text } = Typography;

const roleColor: Record<string, string> = { admin: 'purple', manager: 'blue', staff: 'cyan' };
const roleIcon: Record<string, React.ReactNode> = {
  admin: <CrownOutlined />, manager: <SafetyOutlined />, staff: <UserOutlined />,
};

export default function UsersPage() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);

  const [rows, setRows] = useState<UserRow[]>([]);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);

  // Auth guard
  useEffect(() => {
    if (!initializing && !user) router.replace('/login');
    if (!initializing && user?.role !== 'admin') router.replace('/dashboard');
  }, [user, initializing, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setRows(res.data.data);
      setSummary(res.data.summary);
    } catch {
      message.error('Failed to load users');
    } finally { setLoading(false); }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => { if (user?.role === 'admin') fetchUsers(); }, [fetchUsers, user]);

  const handleDeactivate = async (id: number) => {
    try {
      await userService.deactivate(id);
      message.success('User deactivated');
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to deactivate');
    }
  };

  const handleReactivate = async (id: number) => {
    try {
      await userService.update(id, { isActive: true });
      message.success('User reactivated');
      fetchUsers();
    } catch {
      message.error('Failed to reactivate');
    }
  };

  const columns: ColumnsType<UserRow> = [
    {
      title: 'User',
      key: 'user',
      render: (_, r) => (
        <div className={styles.userCell}>
          <div className={`${styles.avatar} ${styles[`av_${r.role}`]}`}>
            {r.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className={styles.userName}>{r.name}</div>
            <div className={styles.userEmail}>{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => (
        <Tag color={roleColor[role]} icon={roleIcon[role]} className={styles.roleTag}>
          {role.charAt(0).toUpperCase() + role.slice(1)}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? 'green' : 'red'} className={styles.statusTag}>
          {active ? '● Active' : '● Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, r) => (
        <Space>
          <Tooltip title="Edit">
            <Button size="small" icon={<EditOutlined />} onClick={() => setEditUser(r)} />
          </Tooltip>
          {r.isActive ? (
            <Popconfirm title="Deactivate this user?" onConfirm={() => handleDeactivate(r.id)} okText="Yes" cancelText="No">
              <Tooltip title="Deactivate">
                <Button size="small" danger icon={<StopOutlined />} />
              </Tooltip>
            </Popconfirm>
          ) : (
            <Tooltip title="Reactivate">
              <Button size="small" icon={<ReloadOutlined />} onClick={() => handleReactivate(r.id)} style={{ color: '#10b981', borderColor: '#10b981' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (initializing || !user) return null;

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>

        {/* Page header */}
        <div className={styles.header}>
          <div>
            <Title level={3} className={styles.pageTitle}>
              <TeamOutlined className={styles.pageTitleIcon} /> User Management
            </Title>
            <Text className={styles.pageSub}>Manage warehouse staff accounts and access levels</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            className={styles.addBtn}
            onClick={() => setAddOpen(true)}
          >
            Add User
          </Button>
        </div>

        {/* KPI cards */}
        {summary && (
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' }}>👥</div>
              <div>
                <div className={styles.kpiValue}>{summary.total}</div>
                <div className={styles.kpiLabel}>Total Users</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'linear-gradient(135deg,#10b981,#34d399)' }}>✅</div>
              <div>
                <div className={styles.kpiValue}>{summary.active}</div>
                <div className={styles.kpiLabel}>Active</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)' }}>👑</div>
              <div>
                <div className={styles.kpiValue}>{summary.admin}</div>
                <div className={styles.kpiLabel}>Admins</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' }}>🛡️</div>
              <div>
                <div className={styles.kpiValue}>{summary.manager}</div>
                <div className={styles.kpiLabel}>Managers</div>
              </div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiIcon} style={{ background: 'linear-gradient(135deg,#06b6d4,#0e7490)' }}>👤</div>
              <div>
                <div className={styles.kpiValue}>{summary.staff}</div>
                <div className={styles.kpiLabel}>Staff</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filters}>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            allowClear
            className={styles.searchInput}
          />
          <Select
            value={roleFilter || undefined}
            placeholder="All roles"
            allowClear
            onChange={v => setRoleFilter(v ?? '')}
            className={styles.filterSelect}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'manager', label: 'Manager' },
              { value: 'staff', label: 'Staff' },
            ]}
          />
          <Select
            value={statusFilter || undefined}
            placeholder="All status"
            allowClear
            onChange={v => setStatusFilter(v ?? '')}
            className={styles.filterSelect}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchUsers} loading={loading}>Refresh</Button>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <Table
            columns={columns}
            dataSource={rows}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showSizeChanger: false, showTotal: (t) => `${t} users` }}
            rowClassName={(r) => !r.isActive ? styles.inactiveRow : ''}
            className={styles.table}
          />
        </div>
      </main>

      <AddUserModal open={addOpen} onClose={() => setAddOpen(false)} onSuccess={() => { setAddOpen(false); fetchUsers(); }} />
      <EditUserModal user={editUser} open={!!editUser} onClose={() => setEditUser(null)} onSuccess={() => { setEditUser(null); fetchUsers(); }} />
    </div>
  );
}
