'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, Tag, Divider, Alert, Typography, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, EditOutlined, KeyOutlined } from '@ant-design/icons';
import { RootState, AppDispatch } from '@/store/index';
import { authService } from '@/services/authService';
import { initializeAuth } from '@/store/slices/authSlice';
import AppNav from '@/components/nav/AppNav';
import styles from './page.module.css';

const { Title, Text } = Typography;
const roleColor: Record<string, string> = { admin: 'purple', manager: 'blue', staff: 'cyan' };

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { user, initializing } = useSelector((s: RootState) => s.auth);

  const [nameForm] = Form.useForm();
  const [pwForm] = Form.useForm();
  const [savingName, setSavingName] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (!initializing && !user) router.replace('/login');
  }, [user, initializing, router]);

  useEffect(() => {
    if (user) nameForm.setFieldsValue({ name: user.name });
  }, [user, nameForm]);

  const saveName = async (values: { name: string }) => {
    setSavingName(true);
    try {
      await authService.updateProfile(values.name);
      await dispatch(initializeAuth());
      message.success('Name updated successfully');
    } catch {
      message.error('Failed to update name');
    } finally { setSavingName(false); }
  };

  const changePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setSavingPw(true);
    setPwSuccess(false);
    try {
      await authService.changePassword(values.currentPassword, values.newPassword);
      setPwSuccess(true);
      pwForm.resetFields();
      message.success('Password changed');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to change password');
    } finally { setSavingPw(false); }
  };

  if (initializing || !user) return null;

  const initials = user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={styles.root}>
      <AppNav />
      <main className={styles.main}>

        <div className={styles.header}>
          <Title level={3} className={styles.pageTitle}>
            <UserOutlined className={styles.pageTitleIcon} /> My Profile
          </Title>
          <Text className={styles.pageSub}>Manage your account details and security</Text>
        </div>

        <div className={styles.layout}>

          {/* Left — identity card */}
          <div className={styles.identityCard}>
            <div className={styles.avatarXl}>{initials}</div>
            <div className={styles.idName}>{user.name}</div>
            <Tag color={roleColor[user.role]} className={styles.idRoleTag}>
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Tag>
            <div className={styles.idEmail}>
              <MailOutlined className={styles.idEmailIcon} /> {user.email}
            </div>
            <Divider className={styles.idDivider} />
            <div className={styles.idMeta}>
              <div className={styles.idMetaRow}>
                <span className={styles.idMetaLabel}>User ID</span>
                <span className={styles.idMetaValue}>#{user.id}</span>
              </div>
              <div className={styles.idMetaRow}>
                <span className={styles.idMetaLabel}>Access Level</span>
                <span className={styles.idMetaValue}>{user.role}</span>
              </div>
              <div className={styles.idMetaRow}>
                <span className={styles.idMetaLabel}>Status</span>
                <span className={styles.idMetaValue} style={{ color: '#10b981' }}>● Active</span>
              </div>
            </div>
          </div>

          {/* Right — forms */}
          <div className={styles.forms}>

            {/* Edit name */}
            <div className={styles.formCard}>
              <div className={styles.formCardHeader}>
                <div className={styles.formCardIcon} style={{ background: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' }}>
                  <EditOutlined />
                </div>
                <div>
                  <div className={styles.formCardTitle}>Edit Name</div>
                  <div className={styles.formCardSub}>Update your display name</div>
                </div>
              </div>
              <Form form={nameForm} layout="vertical" onFinish={saveName} size="large">
                <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Name is required' }]}>
                  <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="Your name" />
                </Form.Item>
                <div className={styles.formFooter}>
                  <Button type="primary" htmlType="submit" loading={savingName} className={styles.saveBtn}>
                    Save Name
                  </Button>
                </div>
              </Form>
            </div>

            {/* Change password */}
            <div className={styles.formCard}>
              <div className={styles.formCardHeader}>
                <div className={styles.formCardIcon} style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                  <KeyOutlined />
                </div>
                <div>
                  <div className={styles.formCardTitle}>Change Password</div>
                  <div className={styles.formCardSub}>Update your account password</div>
                </div>
              </div>
              {pwSuccess && <Alert message="Password changed successfully!" type="success" showIcon style={{ marginBottom: 16 }} />}
              <Form form={pwForm} layout="vertical" onFinish={changePassword} size="large">
                <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
                  <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Enter current password" />
                </Form.Item>
                <Form.Item name="newPassword" label="New Password" rules={[{ required: true }, { min: 6, message: 'At least 6 characters' }]}>
                  <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Enter new password" />
                </Form.Item>
                <Form.Item name="confirmNewPassword" label="Confirm New Password"
                  dependencies={['newPassword']}
                  rules={[
                    { required: true },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}>
                  <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="Re-enter new password" />
                </Form.Item>
                <div className={styles.formFooter}>
                  <Button type="primary" htmlType="submit" loading={savingPw} className={styles.saveBtn} danger>
                    Change Password
                  </Button>
                </div>
              </Form>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
