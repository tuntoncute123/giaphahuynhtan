'use client';

import { ChevronLeft, ChevronRight, Compass } from 'lucide-react';
import originData from '@/data/origin-story.json';
import OriginChapterArtwork from './OriginChapterArtwork';
import styles from './OriginStory.module.css';

type OriginStoryStageProps = {
  activeChapter: number;
  totalMembers: number;
  totalGenerations: number;
  selectedBranchId: string;
  onSelectBranch: (id: string) => void;
  onNavigate: (index: number) => void;
};

export default function OriginStoryStage({ activeChapter, totalMembers, totalGenerations, selectedBranchId, onSelectBranch, onNavigate }: OriginStoryStageProps) {
  const chapter = originData.chapters[activeChapter];
  return <div className={styles.stageFrame} aria-label={`Minh họa chương ${chapter.number}`}>
    <div className={styles.stageTopBar}>
      <span className={styles.stageChapterTag}><Compass size={13} /> Chương {chapter.number} / 10</span>
      <span className={styles.stageHint}>Theo trang gia phổ</span>
    </div>
    <OriginChapterArtwork key={chapter.id} chapter={activeChapter} totalMembers={totalMembers} totalGenerations={totalGenerations} selectedBranchId={selectedBranchId} onSelectBranch={onSelectBranch} />
    <div className={styles.stageCaptionBar}>
      <div className={styles.stageCaptionText}><strong>{chapter.title}</strong><span>{chapter.locationLabel}</span></div>
      <div className={styles.stageNavBtns}>
        <button type="button" className={styles.artworkNavButton} disabled={activeChapter === 0} onClick={() => onNavigate(activeChapter - 1)} aria-label="Minh họa chương trước"><ChevronLeft size={17} /></button>
        <button type="button" className={styles.artworkNavButton} disabled={activeChapter === originData.chapters.length - 1} onClick={() => onNavigate(activeChapter + 1)} aria-label="Minh họa chương tiếp theo"><ChevronRight size={17} /></button>
      </div>
    </div>
  </div>;
}
