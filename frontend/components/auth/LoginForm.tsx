'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { Form, Input, Button, Checkbox, Alert, Typography } from 'antd';
import { MailOutlined, LockOutlined, WarningOutlined } from '@ant-design/icons';
import { loginUser, clearError } from '@/store/slices/authSlice';
import { AppDispatch, RootState } from '@/store/index';
import styles from './LoginForm.module.css';

const { Title, Text, Link } = Typography;

export default function LoginForm() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error } = useSelector((s: RootState) => s.auth);
  const [form] = Form.useForm();
  const [remember, setRemember] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    dispatch(clearError());
    const result = await dispatch(loginUser({ email: values.email, password: values.password }));
    if (loginUser.fulfilled.match(result)) {
      router.push('/dashboard');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>

        <div className={styles.logoRow}>
          <div className={styles.logoIconWrap}>🏭</div>
          <span className={styles.logoText}>ToyShop WMS</span>
        </div>

        <Title level={2} className={styles.heading}>Welcome Back</Title>
        <Text className={styles.subheading}>Sign in to your warehouse account</Text>

        {error && (
          <Alert
            message={error}
            type="error"
            icon={<WarningOutlined />}
            showIcon
            className={styles.alert}
            closable
            onClose={() => dispatch(clearError())}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          autoComplete="on"
          size="large"
          className={styles.form}
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Enter a valid email address' },
            ]}
          >
            <Input
              prefix={<MailOutlined className={styles.inputIcon} />}
              placeholder="Email address"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined className={styles.inputIcon} />}
              placeholder="Password"
              autoComplete="current-password"
            />
          </Form.Item>

          <div className={styles.rememberRow}>
            <Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
              <span className={styles.rememberLabel}>Remember me</span>
            </Checkbox>
            <Link href="/forgot-password" className={styles.forgotLink}>
              Forgot password?
            </Link>
          </div>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              className={styles.submitBtn}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </Button>
          </Form.Item>
        </Form>

      </div>

      <div className={styles.footer}>
        <div className={styles.footerDot} />
        <Text className={styles.footerText}>ToyShop Warehouse Management System v1.0</Text>
        <div className={styles.footerDot} />
      </div>
    </div>
  );
}
