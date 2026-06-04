'use client';

import { Modal, Form, Input, Select, Button, message } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { userService } from '@/services/userService';
import styles from './AddUserModal.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddUserModal({ open, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();

  const onFinish = async (values: { name: string; email: string; password: string; role: string }) => {
    try {
      await userService.create(values);
      message.success(`User "${values.name}" created successfully`);
      form.resetFields();
      onSuccess();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={() => { form.resetFields(); onClose(); }}
      footer={null}
      title={
        <div className={styles.modalTitle}>
          <span className={styles.titleIcon}><UserAddOutlined /></span>
          Add New User
        </div>
      }
      width={480}
      centered
    >
      <Form form={form} layout="vertical" onFinish={onFinish} size="large" className={styles.form}>
        <Form.Item name="name" label="Full Name" rules={[{ required: true, message: 'Enter full name' }]}>
          <Input placeholder="e.g. John Smith" />
        </Form.Item>

        <Form.Item name="email" label="Email Address"
          rules={[{ required: true }, { type: 'email', message: 'Enter a valid email' }]}>
          <Input placeholder="user@toyshop.com" />
        </Form.Item>

        <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Select a role' }]}>
          <Select placeholder="Select role">
            <Select.Option value="admin">Admin</Select.Option>
            <Select.Option value="manager">Manager</Select.Option>
            <Select.Option value="staff">Staff</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item name="password" label="Password"
          rules={[{ required: true }, { min: 6, message: 'At least 6 characters' }]}>
          <Input.Password placeholder="Min. 6 characters" />
        </Form.Item>

        <Form.Item name="confirmPassword" label="Confirm Password"
          dependencies={['password']}
          rules={[
            { required: true, message: 'Please confirm password' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('password') === value) return Promise.resolve();
                return Promise.reject(new Error('Passwords do not match'));
              },
            }),
          ]}>
          <Input.Password placeholder="Re-enter password" />
        </Form.Item>

        <div className={styles.footer}>
          <Button onClick={() => { form.resetFields(); onClose(); }}>Cancel</Button>
          <Button type="primary" htmlType="submit" className={styles.submitBtn}>
            Create User
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
