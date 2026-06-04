'use client';

import { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, Button, Switch, Divider, message } from 'antd';
import { EditOutlined, KeyOutlined } from '@ant-design/icons';
import { userService, UserRow } from '@/services/userService';
import styles from './EditUserModal.module.css';

interface Props {
  user: UserRow | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditUserModal({ user, open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    if (user) form.setFieldsValue({ name: user.name, role: user.role, isActive: user.isActive });
  }, [user, form]);

  const onSave = async (values: { name: string; role: string; isActive: boolean }) => {
    if (!user) return;
    setSaving(true);
    try {
      await userService.update(user.id, values);
      message.success('User updated');
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const onResetPw = async (values: { newPassword: string }) => {
    if (!user) return;
    setSavingPw(true);
    try {
      await userService.resetPassword(user.id, values.newPassword);
      message.success('Password reset successfully');
      pwForm.resetFields();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Password reset failed');
    } finally { setSavingPw(false); }
  };

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); pwForm.resetFields(); onClose(); }}
      footer={null}
      title={
        <div className={styles.modalTitle}>
          <span className={styles.titleIcon}><EditOutlined /></span>
          Edit User — {user?.name}
        </div>
      }
      width={500}
      centered
    >
      {/* Profile section */}
      <Form form={form} layout="vertical" onFinish={onSave} size="large" className={styles.form}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="admin">Admin</Select.Option>
            <Select.Option value="manager">Manager</Select.Option>
            <Select.Option value="staff">Staff</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="isActive" label="Account Status" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>
        <div className={styles.footer}>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button type="primary" htmlType="submit" loading={saving} className={styles.saveBtn}>Save Changes</Button>
        </div>
      </Form>

      <Divider><span className={styles.dividerLabel}><KeyOutlined /> Reset Password</span></Divider>

      {/* Password reset section */}
      <Form form={pwForm} layout="vertical" onFinish={onResetPw} size="large">
        <Form.Item name="newPassword" label="New Password"
          rules={[{ required: true }, { min: 6, message: 'At least 6 characters' }]}>
          <Input.Password placeholder="Enter new password" />
        </Form.Item>
        <Form.Item name="confirmNewPassword" label="Confirm Password"
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
          <Input.Password placeholder="Re-enter new password" />
        </Form.Item>
        <div className={styles.footer}>
          <Button type="default" htmlType="submit" loading={savingPw} danger>Reset Password</Button>
        </div>
      </Form>
    </Modal>
  );
}
