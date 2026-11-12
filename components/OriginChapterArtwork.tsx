import { ArrowRight } from 'lucide-react';
import OriginLandscapeArtwork from './OriginLandscapeArtwork';
import OriginChapterDiagram, { type DiagramProps } from './OriginChapterDiagram';
import styles from './OriginArtwork.module.css';

const descriptions = [
  'Hai làng quê giữa núi đồi và dòng sông, gợi hành trình từ Xuân Thọ – Sơn Lam đến Nhượng Bạn.',
  'Gà trống cất tiếng gáy bên làng quê dưới ánh trăng, minh họa lời truyền báo nạn trong gia phổ.',
  'Năm thuyền buồm trên biển động: ba chiếc còn nổi và hai chiếc nghiêng chìm trong sóng, theo lời truyền.',
  'Làng quê với mái nhà, ruộng lúa và thuyền bên dòng Trường Giang, gợi buổi đầu khai cư.',
];

function LandscapeCaption({ chapter }: { chapter: number }) {
  if (chapter === 0) return <div className={styles.placePair}><span><strong>Xuân Thọ · Sơn Lam</strong><small>Thanh Hóa</small></span><ArrowRight size={18} /><span><strong>Nhượng Bạn</strong><small>Vùng Kỳ Anh</small></span></div>;
  if (chapter === 1) return <div className={styles.sceneCaption}><strong>Tiếng gà trong đêm</strong><span>Lời truyền báo nạn dưới thời Hậu Lê</span></div>;
  if (chapter === 2) return <div className={styles.voyageLegend}><div><strong>01</strong><span>Dạt Lăng Cô</span></div><div><strong>02</strong><span>Đến Bàn Thạch<br />và Cát Cạo</span></div><div><strong>02</strong><span>Bị đắm ngoài<br />Hải Vân</span></div></div>;
  return <div className={styles.settlementLabels}><strong>Cát Cạo</strong><ArrowRight size={15} /><strong>Hà Bứa</strong><ArrowRight size={15} /><strong>Hà Quan</strong></div>;
}

export default function OriginChapterArtwork(props: DiagramProps) {
  return <div className={styles.artwork} data-origin-artwork={props.chapter + 1}>
    {props.chapter < 4 ? <figure className={styles.landscape}>
      <div className={styles.scene} role="img" aria-label={descriptions[props.chapter]}><OriginLandscapeArtwork chapter={props.chapter} /></div>
      <figcaption><LandscapeCaption chapter={props.chapter} /><p className={styles.provenance}>{props.chapter === 1 || props.chapter === 2 ? 'Minh họa lời truyền trong gia phổ' : 'Minh họa địa danh theo gia phổ'} · không phải ảnh tư liệu</p></figcaption>
    </figure> : <OriginChapterDiagram {...props} />}
  </div>;
}
