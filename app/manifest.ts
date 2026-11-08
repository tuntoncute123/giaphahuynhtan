import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Gia phả Huỳnh Tấn',
    short_name: 'Gia phả Huỳnh Tấn',
    description: 'Xem cây gia phả, nhà thờ và lịch giỗ của họ Huỳnh Tấn.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f6eacb',
    theme_color: '#173b2a',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  };
}
