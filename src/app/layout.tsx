import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '304 Friends — Premium Multiplayer Card Game',
  description: 'Authentic 304 Card Game for private matches with friends. 4-player real-time trick-taking multiplayer card game.',
  keywords: ['304 card game', 'multiplayer card game', '304 online', 'card table', 'friends card game'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0b1320',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
