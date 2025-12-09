import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Topaz-Style Upscaler Gateway',
  description: 'Next.js gateway for external AI upscaling',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
