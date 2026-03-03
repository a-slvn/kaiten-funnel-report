import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeRegistry } from '@/lib/theme-registry';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
});

export const metadata: Metadata = {
  title: 'Отчет «Воронка продаж» | Kaiten',
  description: 'Отчет «Воронка продаж»',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable}`} style={{ fontFamily: '"Inter", sans-serif' }}>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
