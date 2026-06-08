import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'DRIVEIT — Reward & Nomination',
  description: 'HR Reward and Nomination Module',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
