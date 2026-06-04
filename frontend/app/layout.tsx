import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import StoreProvider from '@/store/StoreProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'ToyShop WMS — Warehouse Management System',
  description: 'Smart warehouse management for ToyShop',
};

const theme = {
  token: {
    colorPrimary: '#1e3a5f',
    colorLink: '#1e3a5f',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <ConfigProvider theme={theme}>
            <StoreProvider>
              {children}
            </StoreProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
