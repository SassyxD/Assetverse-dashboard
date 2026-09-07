import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Assetverse — Monitoring',
  description: 'Engineering monitoring dashboard สำหรับ pipeline เก็บข้อมูลอสังหาริมทรัพย์',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
