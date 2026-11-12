import { ArrowRight, BookOpen, Compass, Landmark, MapPin, ScrollText, Sparkles, Sprout, TreePine } from 'lucide-react';
import originData from '@/data/origin-story.json';
import OriginChapterIllustration from './OriginChapterIllustration';
import styles from './OriginStory.module.css';

export default function OriginStoryChapter({ index, isActive, selectedBranchId, setSelectedBranchId, totalMembers, totalGenerations, onFocusMember, onGoTree, onGoShrines, onGoDocuments }: {
  index: number;
  isActive: boolean;
  selectedBranchId: string;
  setSelectedBranchId: (id: string) => void;
  totalMembers: number;
  totalGenerations: number;
  onFocusMember: (id: string) => void;
  onGoTree: () => void;
  onGoShrines: () => void;
  onGoDocuments: () => void;
}) {
  const chapter = originData.chapters[index];
  const selectedBranch = originData.branches.find(branch => branch.id === selectedBranchId) || originData.branches[0];
  return (
                <div
                  
                  className={`${styles.chapterSurface} ${isActive ? styles.chapterSurfaceActive : ''}`}
                >
                  <div className={styles.chapterMetaTop}>
                    <span className={styles.chapterKicker}>{chapter.kicker}</span>
                    <span className={styles.chapterLocationPill}>
                      <MapPin size={12} />
                      {chapter.locationLabel}
                    </span>
                  </div>

                  <h2 id={`${chapter.id}-title`} className={styles.chapterTitle}>
                    {chapter.title}
                  </h2>
                  <OriginChapterIllustration chapter={index} title={chapter.title} totalMembers={totalMembers} totalGenerations={totalGenerations} selectedBranchId={selectedBranchId} onSelectBranch={setSelectedBranchId} />
                  <div className={styles.chapterContextLine}>
                    <span className={styles.chapterPeriod}>{chapter.period}</span>
                    <span className={styles.chapterEvidence}>{chapter.evidence}</span>
                  </div>

                  <blockquote className={styles.poemBox}>
                    <p  className={styles.poemText}>
                      {chapter.quote}
                    </p>
                    <footer className={styles.poemAuthor}>{chapter.quoteAuthor}</footer>
                  </blockquote>

                  <p className={styles.chapterSummary}>{chapter.summary}</p>

                  <div className={styles.oralBox}>
                    <div className={styles.oralTitle}>
                      <Sparkles size={14} />
                      <span>Ghi chú từ tư liệu &amp; lời truyền</span>
                    </div>
                    <p>{chapter.oralMemory}</p>
                  </div>

                  <div className={styles.chapterDetails} aria-label="Các dấu mốc chính">
                    {chapter.details.map(detail => (
                      <div key={detail.label}>
                        <span>{detail.label}</span>
                        <strong>{detail.value}</strong>
                      </div>
                    ))}
                  </div>

                  {index === 3 && (
                    <div className={styles.ctaRow}>
                      <button
                        type="button"
                        className="outline-btn"
                        onClick={() => onFocusMember('ht-tienhien')}
                      >
                        <Sprout size={15} /> Xem Tiền Hiền Hà Bá trên cây
                      </button>
                    </div>
                  )}

                  {index === 5 && (
                    <>
                      <div className={styles.branchCards}>
                        {originData.branches.map(branch => (
                          <button
                            key={branch.id}
                            type="button"
                            className={`${styles.branchBtn} ${selectedBranchId === branch.id ? styles.branchBtnActive : ''}`}
                            onClick={() => setSelectedBranchId(branch.id)}
                            aria-pressed={selectedBranchId === branch.id}
                          >
                            <strong>{branch.name}</strong>
                            <span>{branch.place}</span>
                          </button>
                        ))}
                      </div>
                      <div className={styles.branchDetail} aria-live="polite">
                        <span>{selectedBranch.badge}</span>
                        <h3>{selectedBranch.name}</h3>
                        <p className={styles.branchPlace}><MapPin size={14} /> {selectedBranch.place}</p>
                        <p>{selectedBranch.note}</p>
                      </div>
                      <div className={styles.ctaRow}>
                        <button
                          type="button"
                          className="outline-btn"
                          onClick={() => onFocusMember(selectedBranch.focusMemberId)}
                        >
                          <TreePine size={15} /> Xem nhánh này trên gia phả
                        </button>
                        <button type="button" className="outline-btn" onClick={onGoShrines}>
                          <Landmark size={15} /> Xem Nhà thờ Huỳnh Tấn Tộc
                        </button>
                      </div>
                    </>
                  )}

                  {index === 8 && (
                    <>
                      <div className={styles.chronicleList}>
                        {originData.chronicles.map(item => (
                          <div key={item.year} className={styles.chronicleItem}>
                            <strong>{item.year}</strong>
                            <span>{item.title}</span>
                            <p>{item.detail}</p>
                          </div>
                        ))}
                      </div>
                      <div className={styles.ctaRow}>
                        <button type="button" className="outline-btn" onClick={onGoDocuments}>
                          <ScrollText size={15} /> Mở Tiếu thư &amp; Tư liệu
                        </button>
                      </div>
                    </>
                  )}

                  {index === 9 && (
                    <>
                      <div className={styles.liveNumbersRow}>
                        <div className={styles.liveStatCard}>
                          <strong>{totalMembers || '—'}</strong>
                          <span>Thành viên đã ghi nhận</span>
                        </div>
                        <div className={styles.liveStatCard}>
                          <strong>{totalGenerations || '—'}</strong>
                          <span>Thế hệ nối tiếp</span>
                        </div>
                        <div className={styles.liveStatCard}>
                          <strong>{originData.branches.length}</strong>
                          <span>Chi phái sum họp</span>
                        </div>
                      </div>
                      <div className={styles.ctaRow}>
                        <button type="button" className="primary-btn" onClick={onGoTree}>
                          <TreePine size={16} /> Khám phá cây gia phả <ArrowRight size={15} />
                        </button>
                        <button type="button" className="outline-btn" onClick={onGoDocuments}>
                          <BookOpen size={15} /> Đọc tư liệu &amp; Tiếu thư
                        </button>
                      </div>
                    </>
                  )}

                  <div className={styles.sourceFoot}>
                    <Compass size={13} />
                    <span>{chapter.sourceRef}</span>
                    <button type="button" onClick={onGoDocuments}>Xem tư liệu trích lược <ArrowRight size={12} /></button>
                  </div>
                </div>
  );
}
