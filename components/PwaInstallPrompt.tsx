'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, MoreVertical, Share2, Smartphone, X } from 'lucide-react';

type Platform = 'android' | 'ios';
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

declare global {
  interface Window { __familyPwaInstallPrompt?: InstallPromptEvent }
}

const dismissKey = 'giapha-install-dismissed-at';
const dismissDays = 30;
const dismissedAt = () => { try { return Number(localStorage.getItem(dismissKey) || 0); } catch { return 0; } };
const rememberDismissal = () => { try { localStorage.setItem(dismissKey, String(Date.now())); } catch {} };

export default function PwaInstallPrompt() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [chip, setChip] = useState(false);
  const [steps, setSteps] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const agent = navigator.userAgent;
    const ios = /iPhone|iPod|iPad/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(agent);
    if (!ios && !android) return;
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone) {
      setInstalled(true);
      return;
    }

    setPlatform(ios ? 'ios' : 'android');
    setIsSafari(/Safari/i.test(agent) && !/CriOS|FxiOS|EdgiOS|OPiOS|Zalo|FBAN|FBAV/i.test(agent));
    setInAppBrowser(/Zalo|FBAN|FBAV|Instagram|Line/i.test(agent));
    if (window.__familyPwaInstallPrompt) setDeferred(window.__familyPwaInstallPrompt);

    const lastDismissed = dismissedAt();
    const recentlyDismissed = lastDismissed > 0 && Date.now() - lastDismissed < dismissDays * 24 * 60 * 60 * 1000;
    const timer = recentlyDismissed ? null : window.setTimeout(() => setOpen(true), 1400);
    if (recentlyDismissed) setChip(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      window.__familyPwaInstallPrompt = event as InstallPromptEvent;
      setDeferred(event as InstallPromptEvent);
      setSteps(false);
    };
    const onReady = () => setDeferred(window.__familyPwaInstallPrompt || null);
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
      setChip(false);
      window.__familyPwaInstallPrompt = undefined;
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('family-pwa-install-ready', onReady);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('family-pwa-install-ready', onReady);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    rememberDismissal();
    setOpen(false);
    setSteps(false);
    setChip(true);
  };

  const install = async () => {
    if (!deferred) { setSteps(true); return; }
    const pending = deferred;
    setDeferred(null);
    window.__familyPwaInstallPrompt = undefined;
    try {
      await pending.prompt();
      const choice = await pending.userChoice;
      if (choice.outcome === 'accepted') {
        setOpen(false);
        setChip(false);
      } else dismiss();
    } catch {
      setSteps(true);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch { setCopied(false); }
  };

  if (!platform || installed) return null;
  return <div className="pwa-install-area">
    {open ? <aside className="pwa-install-card" role="dialog" aria-label="Thêm gia phả vào màn hình chính">
      <button className="pwa-install-close" type="button" onClick={dismiss} aria-label="Để sau"><X size={18} /></button>
      <div className="pwa-install-head"><img src="/icons/icon-192.png" alt="" /><div><span>Gia phả Huỳnh Tấn</span><h2>Thêm vào màn hình chính?</h2></div></div>
      <p>Mở cây gia phả, lịch giỗ và vị trí nhà thờ nhanh như một ứng dụng trên điện thoại.</p>
      {steps && <div className="pwa-install-steps">
        {platform === 'ios' ? <>
          {!isSafari && <p><strong>Bước 1:</strong> Mở trang này bằng Safari. Nếu đang xem trong Zalo hoặc Facebook, chọn “Mở bằng trình duyệt”.</p>}
          <p><strong>{isSafari ? 'Bước 1' : 'Bước 2'}:</strong> Trong Safari, nhấn biểu tượng <Share2 size={15} aria-hidden="true" /> <strong>Chia sẻ</strong>.</p>
          <p><strong>{isSafari ? 'Bước 2' : 'Bước 3'}:</strong> Chọn <strong>Thêm vào Màn hình chính</strong>, rồi nhấn <strong>Thêm</strong>.</p>
          {!isSafari && <button type="button" className="pwa-copy-link" onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Đã sao chép liên kết' : 'Sao chép liên kết để mở bằng Safari'}</button>}
        </> : <>
          {inAppBrowser && <p><strong>Bước 1:</strong> Nếu đang xem trong Zalo hoặc Facebook, chọn <strong>Mở bằng Chrome</strong>.</p>}
          <p>Trong Chrome, nhấn biểu tượng <MoreVertical size={15} aria-hidden="true" /> ở góc trên, chọn <strong>Cài đặt ứng dụng</strong> hoặc <strong>Thêm vào Màn hình chính</strong>.</p>
          {inAppBrowser && <button type="button" className="pwa-copy-link" onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? 'Đã sao chép liên kết' : 'Sao chép liên kết để mở bằng Chrome'}</button>}
        </>}
      </div>}
      <div className="pwa-install-actions"><button className="pwa-install-later" type="button" onClick={dismiss}>Để sau</button>{steps ? <button className="pwa-install-main" type="button" onClick={dismiss}><Check size={17} /> Đã hiểu</button> : <button className="pwa-install-main" type="button" onClick={install}><Download size={17} />{platform === 'android' && deferred ? 'Thêm ngay' : 'Xem cách thêm'}</button>}</div>
    </aside> : chip && <button className="pwa-install-chip" type="button" onClick={() => { setOpen(true); setSteps(false); setChip(false); }}><Smartphone size={16} /> Cài ứng dụng</button>}
  </div>;
}
