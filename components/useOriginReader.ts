'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import originData from '@/data/origin-story.json';

const STORAGE_KEY = 'huynh-tan-origin-reader-v1';
const LAST_CHAPTER = originData.chapters.length - 1;

export default function useOriginReader() {
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const dockRef = useRef<HTMLDivElement>(null);
  const readingStarted = useRef(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const [staticMode, setStaticMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [textSize, setTextSize] = useState(0);
  const [resumeChapter, setResumeChapter] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const motionOff = staticMode || reducedMotion;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(media.matches);
    updateMotion();
    media.addEventListener('change', updateMotion);
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        const index = originData.chapters.findIndex(chapter => chapter.id === saved.chapter);
        if (index > 0) setResumeChapter(index);
        if (typeof saved.staticMode === 'boolean') setStaticMode(saved.staticMode);
        if (Number.isInteger(saved.textSize) && saved.textSize >= 0 && saved.textSize <= 2) setTextSize(saved.textSize);
      }
    } catch { /* Reading remains available when storage is disabled. */ }
    setReady(true);
    return () => media.removeEventListener('change', updateMotion);
  }, []);

  const readingOffset = useCallback(() => {
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height || 78;
    return header + (dockRef.current?.getBoundingClientRect().height || 64) + 24;
  }, []);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      frame = 0;
      const first = chapterRefs.current[0];
      const last = chapterRefs.current[LAST_CHAPTER];
      if (!first || !last) return;
      const offset = readingOffset();
      const firstTop = first.getBoundingClientRect().top;
      let current = 0;
      chapterRefs.current.forEach((chapter, index) => {
        if (chapter && chapter.getBoundingClientRect().top <= offset + 48) current = index;
      });
      if (firstTop <= offset + 48) readingStarted.current = true;
      const start = window.scrollY + firstTop - offset;
      const end = window.scrollY + last.getBoundingClientRect().bottom - window.innerHeight;
      setProgress(Math.round(Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(1, end - start))) * 100));
      setActiveChapter(current);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sync); };
    const observer = new ResizeObserver(schedule);
    chapterRefs.current.forEach(chapter => { if (chapter) observer.observe(chapter); });
    if (dockRef.current) observer.observe(dockRef.current);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [readingOffset]);

  useEffect(() => {
    if (!ready) return;
    // Do not replace the saved chapter simply because the introduction mounted.
    const savedChapter = readingStarted.current ? activeChapter : resumeChapter;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        chapter: savedChapter === null ? null : originData.chapters[savedChapter].id,
        staticMode,
        textSize
      }));
    } catch { /* Storage is optional. */ }
  }, [activeChapter, progress, ready, resumeChapter, staticMode, textSize]);

  const scrollToChapter = useCallback((index: number) => {
    setAutoPlay(false);
    const target = chapterRefs.current[Math.max(0, Math.min(LAST_CHAPTER, index))];
    if (!target) return;
    readingStarted.current = true;
    target.focus({ preventScroll: true });
    window.scrollTo({
      top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - readingOffset()),
      behavior: motionOff ? 'instant' : 'smooth'
    });
  }, [motionOff, readingOffset]);

  useEffect(() => {
    if (motionOff) setAutoPlay(false);
  }, [motionOff]);

  useEffect(() => {
    if (!autoPlay || motionOff) return;
    let frame = 0;
    let previous = performance.now();
    const stop = () => setAutoPlay(false);
    const keyStop = (event: KeyboardEvent) => {
      if (['Escape', ' ', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) stop();
    };
    const visibilityStop = () => { if (document.hidden) stop(); };
    const step = (now: number) => {
      const last = chapterRefs.current[LAST_CHAPTER];
      if (!last || last.getBoundingClientRect().bottom <= window.innerHeight + 2) { stop(); return; }
      window.scrollBy({ top: Math.min(now - previous, 64) * 0.032, behavior: 'instant' });
      previous = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', keyStop);
    document.addEventListener('visibilitychange', visibilityStop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', keyStop);
      document.removeEventListener('visibilitychange', visibilityStop);
    };
  }, [autoPlay, motionOff]);

  return {
    chapterRefs, dockRef, activeChapter, progress, autoPlay, setAutoPlay,
    staticMode, setStaticMode, motionOff, reducedMotion, textSize, setTextSize,
    resumeChapter, scrollToChapter
  };
}
