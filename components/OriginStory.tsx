'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowRight, BookOpen, Bookmark, Compass, Image, Map, ScrollText, Sprout, TreePine } from 'lucide-react';
import originData from '@/data/origin-story.json';
import { generationOf } from '@/lib/family';
import type { Member } from '@/lib/types';
import OriginJourneyMap from './OriginJourneyMap';
import OriginStoryChapter from './OriginStoryChapter';
import OriginStoryStage from './OriginStoryStage';
import OriginReaderControls from './OriginReaderControls';
import useOriginReader from './useOriginReader';
import styles from './OriginStory.module.css';

type OriginStoryProps = {
  members: Member[];
  onGoTree: () => void;
  onFocusMember: (id: string) => void;
  onGoShrines: () => void;
  onGoDocuments: () => void;
};

export default function OriginStory({ members, onGoTree, onFocusMember, onGoShrines, onGoDocuments }: OriginStoryProps) {
  const reader = useOriginReader();
  const [selectedBranchId, setSelectedBranchId] = useState(originData.branches[0].id);
  const [atlasView, setAtlasView] = useState<'illustration' | 'map'>('illustration');
  const totalGenerations = useMemo(() => members.length ? Math.max(...members.map(member => generationOf(member.id, members))) : 0, [members]);
  const current = originData.chapters[reader.activeChapter];

  return <div className={styles.originShell} data-reading-size={reader.textSize} style={{ '--reading-size': `${17 + reader.textSize * 2}px` } as CSSProperties}>
    <section className={styles.introBand} aria-labelledby="origin-heading">
      <div className={`container ${styles.heroGrid}`}>
        <div className={styles.introCopy}>
          <span className={styles.heroEyebrow}><span className={styles.heroEyebrowLine} /> CỘI NGUỒN DÒNG HỌ HUỲNH TẤN</span>
          <h1 id="origin-heading">Một cội nguồn.<br /><em>Muôn đời tiếp nối.</em></h1>
          <p>{originData.subtitle}</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.heroPrimary} onClick={() => reader.scrollToChapter(reader.resumeChapter ?? 0)}>
              {reader.resumeChapter === null ? <BookOpen size={18} /> : <Bookmark size={18} />}
              {reader.resumeChapter === null ? 'Bắt đầu hành trình' : `Đọc tiếp chương ${originData.chapters[reader.resumeChapter].number}`}
              <ArrowRight size={17} />
            </button>
            <button type="button" className={styles.heroSecondary} onClick={onGoTree}><TreePine size={17} /> Cây gia phả</button>
          </div>
          {reader.resumeChapter !== null && <button type="button" className={styles.restartLink} onClick={() => reader.scrollToChapter(0)}>Hoặc đọc lại từ chương đầu <ArrowRight size={13} /></button>}
          <div className={styles.heroFacts} aria-label="Dấu mốc hành trình">
            <span><strong>10</strong><small>chương chuyện dòng họ</small></span>
            <span><strong>04</strong><small>phái còn liên hệ</small></span>
            <span><strong>1874</strong><small>mốc tu diễn gia phổ</small></span>
          </div>
          <div className={styles.heroSource}><ScrollText size={16} /><span>Dựa trên Tân Gia phả chung 2023.<br />Gìn giữ lời truyền, ghi rõ nguồn tư liệu.</span></div>
        </div>
        <div className={styles.journeyPanel} aria-label="Bản đồ hành trình theo gia phổ">
          <div className={styles.journeyTop}><span><Compass size={15} /> THEO DẤU TIỀN NHÂN</span><span>VIỆT NAM</span></div>
          <OriginJourneyMap activeChapter={reader.activeChapter} onSelectChapter={reader.scrollToChapter} animate={!reader.motionOff} />
          <p>Vị trí và tuyến nối minh họa theo gia phổ · Đường biên: <a href="https://www.geoboundaries.org/countryDownloads.html" target="_blank" rel="noopener noreferrer">geoBoundaries · CC BY 4.0</a></p>
        </div>
      </div>
      <div className={`container ${styles.journeyRibbon}`}>
        <span><Sprout size={17} /> TỪ CỐ HƯƠNG ĐẾN HÔM NAY</span>
        <div><span>Thanh – Nghệ</span><ArrowRight size={13} /><span>Hà Quan</span><ArrowRight size={13} /><span>Nam – Ngãi</span><ArrowRight size={13} /><span>Muôn thế hệ</span></div>
        <button type="button" onClick={() => reader.scrollToChapter(0)} aria-label="Cuộn đến chương đầu"><ArrowDown size={18} /></button>
      </div>
    </section>

    <OriginReaderControls
      dockRef={reader.dockRef} activeChapter={reader.activeChapter} progress={reader.progress}
      textSize={reader.textSize} onTextSize={reader.setTextSize} staticMode={reader.staticMode}
      reducedMotion={reader.reducedMotion} onStaticMode={reader.setStaticMode}
      autoPlay={reader.autoPlay} onAutoPlay={reader.setAutoPlay} onNavigate={reader.scrollToChapter}
    />

    <section className={`container ${styles.storyLayout}`} aria-label="Mười chương cội nguồn">
      <div className={styles.chaptersColumn}>
        {originData.chapters.map((chapter, index) => <article
          key={chapter.id} id={chapter.id} tabIndex={-1} aria-labelledby={`${chapter.id}-title`}
          ref={element => { reader.chapterRefs.current[index] = element; }}
          className={styles.chapterCard} data-number={chapter.number}
        >
          <OriginStoryChapter
            index={index} isActive={reader.activeChapter === index}
            selectedBranchId={selectedBranchId} setSelectedBranchId={setSelectedBranchId}
            totalMembers={members.length} totalGenerations={totalGenerations}
            onFocusMember={onFocusMember} onGoTree={onGoTree} onGoShrines={onGoShrines} onGoDocuments={onGoDocuments}
          />
          {index < originData.chapters.length - 1 && <button type="button" className={styles.nextChapterLink} onClick={() => reader.scrollToChapter(index + 1)}>
            <span>TIẾP THEO <strong>{originData.chapters[index + 1].shortLabel}</strong></span><ArrowDown size={18} />
          </button>}
        </article>)}
      </div>
      <aside className={styles.stageColumn} aria-label="Hình ảnh và bản đồ theo chương">
        <div className={styles.atlasTabs} role="group" aria-label="Cách xem hành trình">
          <button type="button" aria-pressed={atlasView === 'illustration'} onClick={() => setAtlasView('illustration')}><Image size={16} /> Minh họa</button>
          <button type="button" aria-pressed={atlasView === 'map'} onClick={() => setAtlasView('map')}><Map size={16} /> Bản đồ</button>
        </div>
        {atlasView === 'illustration' ? <OriginStoryStage
          activeChapter={reader.activeChapter}
          totalMembers={members.length} totalGenerations={totalGenerations}
          selectedBranchId={selectedBranchId} onSelectBranch={setSelectedBranchId} onNavigate={reader.scrollToChapter}
        /> : <div className={styles.readerMap}>
          <div className={styles.readerMapHeading}><Compass size={16} /><span>CHƯƠNG {current.number} · {current.shortLabel}</span></div>
          <OriginJourneyMap activeChapter={reader.activeChapter} onSelectChapter={reader.scrollToChapter} compact animate={!reader.motionOff} />
          <p className={styles.mapDisclaimer}>Địa danh minh họa theo gia phổ, không xác định vị trí nhà hay mộ cụ thể.</p>
        </div>}
        <div className={styles.readerNote}><ScrollText size={17} /><p>Lịch sử được nối từ những trang gia phổ và lời kể. Mỗi chương giữ lại nguồn trích và những điều còn cần đối chiếu.</p></div>
        <button type="button" className={styles.atlasSourceLink} onClick={onGoDocuments}>Mở kho tư liệu dòng họ <ArrowRight size={15} /></button>
      </aside>
    </section>

    <section className={`container ${styles.storyClosing}`} aria-labelledby="origin-closing-title">
      <span className={styles.closingEmblem}><Sprout size={30} /></span>
      <span className={styles.chapterKicker}>CÂU CHUYỆN VẪN ĐANG ĐƯỢC VIẾT TIẾP</span>
      <h2 id="origin-closing-title">Mỗi người con, một nhánh tiếp nối.</h2>
      <p>Từ những trang gia phổ đến tên người thân quen, hãy cùng gìn giữ ký ức của dòng họ cho thế hệ mai sau.</p>
      <div className={styles.closingActions}>
        <button type="button" className="primary-btn" onClick={onGoTree}><TreePine size={17} /> Khám phá cây gia phả <ArrowRight size={16} /></button>
        <button type="button" className="outline-btn" onClick={onGoDocuments}><BookOpen size={17} /> Đọc tư liệu gốc</button>
      </div>
      <button type="button" className={styles.backToBeginning} onClick={() => reader.scrollToChapter(0)}>Trở về chương đầu</button>
    </section>
  </div>;
}
