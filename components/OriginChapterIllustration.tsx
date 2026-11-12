import OriginChapterArtwork from './OriginChapterArtwork';
import type { DiagramProps } from './OriginChapterDiagram';
import styles from './OriginStory.module.css';

export default function OriginChapterIllustration({ title, ...props }: DiagramProps & { title: string }) {
  return <div className={styles.chapterIllustration} aria-label={`Minh họa: ${title}`}>
    <OriginChapterArtwork {...props} />
  </div>;
}
