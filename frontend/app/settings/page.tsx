'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Select, Switch, Popconfirm, Input, Button, Tag, message, Modal, Form } from 'antd';
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  KeyOutlined, StopOutlined, CheckCircleOutlined,
  CrownOutlined, SafetyOutlined, UserOutlined,
} from '@ant-design/icons';
import { RootState } from '@/store/index';
import { userService, UserRow } from '@/services/userService';
import AppNav from '@/components/nav/AppNav';
import TopBar from '@/components/nav/TopBar';
import AddUserModal from '@/components/admin/AddUserModal';
import styles from './page.module.css';

// ─── Role definitions — edit this array to add/remove roles & permissions ────
const ROLES = [
  {
    key: 'admin',
    label: 'Admin',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
    icon: '👑',
    description: 'Full system access',
    perms: [
      'Manage users & roles',
      'Add / remove warehouses',
      'All inventory operations',
      'Create & manage orders',
      'View all reports & exports',
      'System settings',
    ],
  },
  {
    key: 'manager',
    label: 'Manager',
    color: '#1d4ed8',
    bg: 'linear-gradient(135deg,#1d4ed8,#60a5fa)',
    icon: '🛡️',
    description: 'Operations management',
    perms: [
      'View & adjust inventory',
      'Create & update orders',
      'Manage shipments',
      'View all reports',
      'Export reports',
      'Cannot manage users',
    ],
  },
  {
    key: 'staff',
    label: 'Staff',
    color: '#0891b2',
    bg: 'linear-gradient(135deg,#0891b2,#22d3ee)',
    icon: '👤',
    description: 'Day-to-day operations',
    perms: [
      'View inventory',
      'Pick & pack orders',
      'Update shipment status',
      'View own reports',
      'Cannot adjust stock',
      'Cannot access admin panel',
    ],
  },
];

const ROLE_OPTS = ROLES.map(r => ({ value: r.key, label: r.label }));
const ROLE_COLOR: Record<string, string> = { admin: 'purple', manager: 'blue', staff: 'cyan' };

export default function SettingsPage() {
  const router = useRouter();
  const { user, initializing } = useSelector((s: RootState) => s.auth);

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Reset-password modal state
  const [pwUser, setPwUser] = useState<UserRow | null>(null);
  const [pwForm] = Form.useForm();
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (!initializing && !user) router.replace('/login');
    if (!initializing && user?.role !== 'admin') router.replace('/dashboard');
  }, [user, initializing, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.list({ search: search || undefined });
      setRows(res.data.data);
    } catch { message.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { if (user?.role === 'admin') load(); }, [load, user]);

  const changeRole = async (id: number, role: string) => {
    setSaving(id);
    try {
      await userService.update(id, { role });
      setRows(prev => prev.map(r => r.id === id ? { ...r, role } : r));
      message.success('Role updated');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || 'Failed to update role');
    } finally { setSaving(null); }
  };

  const toggleActive = async (id: number, active: boolean) => {
    if (id === user!.id) { message.warning('Cannot deactivate your own account'); return; }
    setSaving(id);
    try {
      if (active) {
        await userService.update(id, { isActive: true });
      } else {
        await userService.deactivate(id);
      }
      setRows(prev => prev.map(r => r.id === id ? { ...r, isActive: active } : r));
      message.success(active ? 'User reactivated' : 'User deactivated');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || 'Failed to update status');
    } finally { setSaving(null); }
  };

  const submitPw = async (values: { password: string }) => {
    if (!pwUser) return;
    setPwLoading(true);
    try {
      await userService.resetPassword(pwUser.id, values.password);
      message.success(`Password reset for ${pwUser.name}`);
      setPwUser(null);
      pwForm.resetFields();
    } catch { message.error('Failed to reset password'); }
    finally { setPwLoading(false); }
  };

  const filtered = rows.filter(r =>
    !search ||
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.email.toLowerCase().includes(search.toLowerCase())
  );

  if (initializing || !user) return null;

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>
        <TopBar title="Settings" />
        <div className={styles.content}>

          <div className={styles.pageHeader}>
            <div>
              <div className={styles.pageTitle}>⚙️ Settings</div>
              <div className={styles.pageSub}>Manage team access, roles, and permissions</div>
            </div>
          </div>

          {/* ── Role Cards ─────────────────────────────────────────── */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Role Permissions</div>
            <div className={styles.roleCards}>
              {ROLES.map(role => (
                <div key={role.key} className={styles.roleCard}>
                  <div className={styles.roleCardHeader} style={{ background: role.bg }}>
                    <span className={styles.roleCardIcon}>{role.icon}</span>
                    <div>
                      <div className={styles.roleCardName}>{role.label}</div>
                      <div className={styles.roleCardDesc}>{role.description}</div>
                    </div>
                  </div>
                  <ul className={styles.permList}>
                    {role.perms.map(p => (
                      <li key={p} className={p.startsWith('Cannot') ? styles.permNo : styles.permYes}>
                        <span>{p.startsWith('Cannot') ? '✕' : '✓'}</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* ── User Table ─────────────────────────────────────────── */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Team Members</div>
              <div className={styles.sectionActions}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Search name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  allowClear
                  className={styles.search}
                />
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading} />
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
                  Add User
                </Button>
              </div>
            </div>

            <div className={styles.userTable}>
              {/* Header */}
              <div className={styles.tableHead}>
                <span>User</span>
                <span>Role</span>
                <span>Active</span>
                <span>Actions</span>
              </div>

              {filtered.length === 0 && (
                <div className={styles.empty}>No users found</div>
              )}

              {filtered.map(u => {
                const isSelf = u.id === user.id;
                const roleInfo = ROLES.find(r => r.key === u.role);
                return (
                  <div key={u.id} className={`${styles.tableRow} ${!u.isActive ? styles.rowInactive : ''}`}>
                    {/* User cell */}
                    <div className={styles.userCell}>
                      <div className={styles.avatar} style={{ background: roleInfo?.bg ?? '#94a3b8' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.userName}>
                          {u.name}
                          {isSelf && <span className={styles.youBadge}>you</span>}
                        </div>
                        <div className={styles.userEmail}>{u.email}</div>
                      </div>
                    </div>

                    {/* Role selector */}
                    <div>
                      <Select
                        value={u.role}
                        options={ROLE_OPTS}
                        onChange={val => changeRole(u.id, val)}
                        loading={saving === u.id}
                        disabled={saving === u.id}
                        className={styles.roleSelect}
                        size="small"
                        optionRender={opt => (
                          <Tag color={ROLE_COLOR[String(opt.value)]} style={{ fontSize: 11 }}>
                            {String(opt.label)}
                          </Tag>
                        )}
                      />
                    </div>

                    {/* Active toggle */}
                    <div>
                      <Switch
                        checked={u.isActive}
                        onChange={checked => toggleActive(u.id, checked)}
                        loading={saving === u.id}
                        disabled={isSelf}
                        checkedChildren="On"
                        unCheckedChildren="Off"
                        size="small"
                      />
                    </div>

                    {/* Actions */}
                    <div className={styles.actions}>
                      <Button
                        size="small"
                        icon={<KeyOutlined />}
                        title="Reset password"
                        onClick={() => { setPwUser(u); }}
                      />
                      {u.isActive && !isSelf ? (
                        <Popconfirm
                          title={`Deactivate ${u.name}?`}
                          onConfirm={() => toggleActive(u.id, false)}
                          okText="Yes" cancelText="No"
                        >
                          <Button size="small" danger icon={<StopOutlined />} title="Deactivate" />
                        </Popconfirm>
                      ) : !u.isActive ? (
                        <Button
                          size="small"
                          icon={<CheckCircleOutlined />}
                          style={{ color: '#10b981', borderColor: '#10b981' }}
                          title="Reactivate"
                          onClick={() => toggleActive(u.id, true)}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* Add User */}
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => { setAddOpen(false); load(); }}
      />

      {/* Reset Password */}
      <Modal
        title={`Reset password — ${pwUser?.name}`}
        open={!!pwUser}
        onCancel={() => { setPwUser(null); pwForm.resetFields(); }}
        onOk={() => pwForm.submit()}
        confirmLoading={pwLoading}
        okText="Reset"
        width={380}
      >
        <Form form={pwForm} layout="vertical" onFinish={submitPw} style={{ marginTop: 12 }}>
          <Form.Item name="password" label="New Password"
            rules={[{ required: true }, { min: 6, message: 'At least 6 characters' }]}>
            <Input.Password placeholder="Min 6 characters" />
          </Form.Item>
          <Form.Item name="confirm" label="Confirm Password"
            dependencies={['password']}
            rules={[{ required: true },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) return Promise.resolve();
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}>
            <Input.Password placeholder="Re-enter password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
