import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Loud Notes!',
  description: 'A private, browser-based notes collection.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
