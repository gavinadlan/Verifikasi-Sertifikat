import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CertChain',
  description: 'Blockchain-based Seminar Certificate Verification Platform',
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
