import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gia phả Huỳnh Tấn',
  description: 'Lưu giữ cội nguồn, kết nối các thế hệ dòng họ Huỳnh Tấn.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: '/icons/apple-touch-icon.png'
  },
  appleWebApp: { capable: true, title: 'Gia phả Huỳnh Tấn', statusBarStyle: 'default' }
};
export const viewport: Viewport = { themeColor: '#173b2a' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body suppressHydrationWarning><Script id="capture-pwa-install" strategy="beforeInteractive">{"window.addEventListener('beforeinstallprompt', function(event) { event.preventDefault(); window.__familyPwaInstallPrompt = event; window.dispatchEvent(new Event('family-pwa-install-ready')); });"}</Script>{children}<PwaInstallPrompt /></body></html>;
}
