'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Form, Input, Button, Typography, Result } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { authService } from '@/services/authService';
import styles from './ForgotPasswordForm.module.css';

const { Title, Text } = Typography;

export default function ForgotPasswordForm() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form] = Form.useForm();

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    try {
      await authService.forgotPassword(values.email);
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Result
            icon={<span style={{ fontSize: 56 }}>✅</span>}
            title={<span className={styles.resultTitle}>Check your inbox</span>}
            subTitle={<span className={styles.resultSub}>If this email is registered, you&apos;ll receive a password reset link shortly.</span>}
            extra={
              <Link href="/login" className={styles.backLink}>
                <ArrowLeftOutlined /> Back to Login
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoIconWrap}>🏭</div>
          <span className={styles.logoText}>ToyShop WMS</span>
        </div>

        <Title level={2} className={styles.heading}>Reset Password</Title>
        <Text className={styles.subheading}>
          Enter your email and we&apos;ll send you a reset link
        </Text>

        <Form form={form} layout="vertical" onFinish={onFinish} size="large" className={styles.form}>
          <Form.Item name="email" rules={[{ required: true }, { type: 'email' }]}>
            <Input
              prefix={<MailOutlined style={{ color: '#a5b4fc' }} />}
              placeholder="Email address"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block className={styles.submitBtn}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </Button>
          </Form.Item>
        </Form>

        <div className={styles.backRow}>
          <Link href="/login" className={styles.backLink}>
            <ArrowLeftOutlined /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
