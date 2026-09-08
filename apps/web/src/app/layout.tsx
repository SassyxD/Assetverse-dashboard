import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const sans = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-thai',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Assetverse Monitoring',
  description: 'มอนิเตอร์ pipeline เก็บข้อมูลอสังหาริมทรัพย์ 17 เว็บ',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans text-[13px] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
