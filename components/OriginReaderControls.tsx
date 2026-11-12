'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, List, Pause, Play, Search, Type, X } from 'lucide-react';
import { normalizeSearch } from '@/lib/family';
import originData from '@/data/origin-story.json';
import styles from './OriginStory.module.css';

export default function OriginReaderControls({ dockRef, activeChapter, progress, textSize, onTextSize, staticMode, reducedMotion, onStaticMode, autoPlay, onAutoPlay, onNavigate }: {
  dockRef: RefObject<HTMLDivElement | null>;
  activeChapter: number;
  progress: number;
  textSize: number;
  onTextSize: (size: number) => void;
  staticMode: boolean;
  reducedMotion: boolean;
  onStaticMode: (value: boolean) => void;
  autoPlay: boolean;
  onAutoPlay: (value: boolean) => void;
  onNavigate: (index: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const current = originData.chapters[activeChapter];
  const needle = normalizeSearch(query);
  const chapters = originData.chapters.map((chapter, index) => ({ ...chapter, index })).filter(chapter =>
    normalizeSearch(`${chapter.number} ${chapter.title} ${chapter.locationLabel} ${chapter.period}`).includes(needle)
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open) return;
    dialog.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previous;
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setQuery('');
    returnFocusRef.current?.focus({ preventScroll: true });
  };
  const select = (index: number) => {
    // Release the dialog's focus trap before focusing a chapter in the page.
    dialogRef.current?.close();
    close();
    requestAnimationFrame(() => onNavigate(index));
  };

  return <>
    <div ref={dockRef} className={styles.progressDock}>
      <div className={`container ${styles.readerToolbar}`}>
        <button ref={returnFocusRef} type="button" className={styles.contentsTrigger} aria-haspopup="dialog" aria-expanded={open} onClick={() => { onAutoPlay(false); setOpen(true); }}>
          <List size={19} /><span>Mục lục</span><span className={styles.contentsCount}>10</span>
        </button>
        <div className={styles.readingPosition}>
          <span>CHƯƠNG {current.number} <span>/ 10</span></span>
          <strong>{current.shortLabel}</strong>
        </div>
        <div className={styles.readingTools} role="group" aria-label="Tùy chỉnh cách đọc">
          <button type="button" className={styles.readerTool} onClick={() => { const next = (textSize + 1) % 3; onTextSize(next); setAnnouncement(`Cỡ chữ ${['tiêu chuẩn', 'lớn', 'rất lớn'][next]}`); }} aria-label={`Cỡ chữ: ${['tiêu chuẩn', 'lớn', 'rất lớn'][textSize]}. Nhấn để đổi cỡ chữ.`} title="Đổi cỡ chữ">
            <Type size={18} /><span className={styles.textSizeDots} aria-hidden="true">{['•', '••', '•••'][textSize]}</span>
          </button>
          <button type="button" className={styles.readerTool} aria-pressed={staticMode || reducedMotion} disabled={reducedMotion} onClick={() => onStaticMode(!staticMode)} title={reducedMotion ? 'Đã giảm chuyển động theo cài đặt thiết bị' : 'Bật hoặc tắt hiệu ứng minh họa'} aria-label="Đọc tĩnh">
            <BookOpen size={17} /><span>Đọc tĩnh</span>
          </button>
          <button type="button" className={styles.readerTool} aria-pressed={autoPlay} disabled={staticMode || reducedMotion || progress >= 100} onClick={() => onAutoPlay(!autoPlay)} title="Tự cuộn chậm; cuộn tay hoặc nhấn Escape để dừng" aria-label={autoPlay ? 'Dừng tự cuộn' : 'Tự cuộn'}>
            {autoPlay ? <Pause size={17} /> : <Play size={17} />}<span>{autoPlay ? 'Tạm dừng' : 'Tự cuộn'}</span>
          </button>
        </div>
        <nav className={styles.slideNavMini} aria-label="Chuyển chương">
          <button type="button" className={styles.iconCircleBtn} onClick={() => onNavigate(activeChapter - 1)} disabled={activeChapter === 0} aria-label="Chương trước"><ChevronLeft size={18} /></button>
          <button type="button" className={styles.iconCircleBtn} onClick={() => onNavigate(activeChapter + 1)} disabled={activeChapter === originData.chapters.length - 1} aria-label="Chương kế tiếp"><ChevronRight size={18} /></button>
        </nav>
      </div>
      <div className={styles.readingProgress} role="progressbar" aria-label="Tiến độ đọc cội nguồn" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${progress}% · Chương ${current.number}: ${current.shortLabel}`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <span className={styles.srOnly} role="status">{announcement}</span>
    </div>

    <dialog ref={dialogRef} className={styles.contentsDialog} aria-labelledby="origin-contents-title" onCancel={close} onClose={() => { setOpen(false); setQuery(''); }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className={styles.contentsPanel}>
        <div className={styles.contentsHeader}>
          <div><span className={styles.chapterKicker}>GIA PHỔ HUỲNH TẤN</span><h2 id="origin-contents-title">Mười chương, một cội nguồn</h2></div>
          <button type="button" className={styles.iconCircleBtn} onClick={close} aria-label="Đóng mục lục"><X size={20} /></button>
        </div>
        <label className={styles.contentsSearch}>
          <Search size={18} /><span className={styles.srOnly}>Tìm chương hoặc địa danh</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm chương, địa danh…" autoFocus />
          {query && <button type="button" onClick={() => setQuery('')} aria-label="Xóa tìm kiếm"><X size={16} /></button>}
        </label>
        <p className={styles.contentsHint}>Từ quê gốc Thanh – Nghệ đến những thế hệ hôm nay.</p>
        <nav className={styles.contentsList} aria-label="Mục lục cội nguồn">
          {chapters.map(chapter => <button key={chapter.id} type="button" className={`${styles.contentsItem} ${activeChapter === chapter.index ? styles.contentsItemActive : ''}`} aria-current={activeChapter === chapter.index ? 'step' : undefined} onClick={() => select(chapter.index)}>
            <span className={styles.contentsNumber}>{chapter.number}</span>
            <span><strong>{chapter.shortLabel}</strong><small>{chapter.locationLabel}</small></span>
            {activeChapter === chapter.index ? <Check size={17} /> : <ChevronRight size={17} />}
          </button>)}
          {!chapters.length && <p className={styles.contentsEmpty}>Chưa tìm thấy chương phù hợp. Thử “Hà Quan”, “Tân Hy” hoặc số chương.</p>}
        </nav>
        <div className={styles.contentsFooter}><BookOpen size={15} /><span>{chapters.length} / {originData.chapters.length} chương · Có thể tìm không dấu</span></div>
      </div>
    </dialog>
  </>;
}
