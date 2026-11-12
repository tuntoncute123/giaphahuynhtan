import { ArrowRight, GitBranch, MapPin, ScrollText, Sprout } from 'lucide-react';
import { ChronicleBook } from './OriginArtworkPrimitives';
import styles from './OriginArtwork.module.css';

export type DiagramProps = {
  chapter: number;
  selectedBranchId?: string;
  onSelectBranch?: (id: string) => void;
  totalMembers?: number;
  totalGenerations?: number;
};

const branches = [
  { id: 'ha-quan', name: 'Hà Quan', detail: 'Chánh phái' },
  { id: 'nui-ruon', name: 'Núi Rướn', detail: 'Quý phái' },
  { id: 'tan-hy', name: 'Tân Hy', detail: 'Nhà thờ Tổ' },
  { id: 'son-tra', name: 'Sơn Trà', detail: 'Nhánh Nam – Ngãi' },
];

function BranchDiagram({ later = false }: { later?: boolean }) {
  const children = later
    ? [{ name: 'Đồng Chổi', note: 'Nhánh Hà Quan' }, { name: 'Thạch Kiều', note: 'Nhánh Hà Quan' }, { name: 'Thành Mỹ', note: 'Nhánh Hà Quan' }]
    : [{ name: 'Chánh phái', note: 'Hà Quan' }, { name: 'Thứ phái', note: 'Chưa rõ nơi cư trú' }, { name: 'Quý phái', note: 'Núi Rướn' }];
  return <>
    <div className={styles.treeRoot}><GitBranch size={23} /><strong>Hà Quan</strong><span>{later ? 'Chánh phái' : 'Từ đời thứ tư'}</span></div>
    <div className={styles.treeChildren}>
      {children.map((child, index) => <div key={child.name} className={`${styles.treeNode} ${!later && index === 1 ? styles.uncertain : ''}`}>
        <span className={styles.nodeDot} /><strong>{child.name}</strong><span>{child.note}</span>
      </div>)}
    </div>
    <p className={styles.diagramNote}>{later ? 'Gia phổ còn nhắc đến Hòa Xuân, Tỉnh Thủy; một số chi thiếu tư liệu.' : 'Ba phái buổi đầu theo gia phổ. Nơi cư trú của Thứ phái chưa được xác định.'}</p>
  </>;
}

function Migration({ selectedBranchId, onSelectBranch }: Pick<DiagramProps, 'selectedBranchId' | 'onSelectBranch'>) {
  return <>
    <ol className={styles.migration} aria-label="Hai đời chuyển cư về Tân Hy">
      <li><span className={styles.routeNumber}>01</span><div><strong>Huỳnh Tấn Lộc</strong><p>Hải Ninh <ArrowRight size={13} /> Phước Thuận – Tiên Đào</p></div></li>
      <li><span className={styles.routeNumber}>02</span><div><strong>Huỳnh Tấn Hiền <small>· con trai</small></strong><p>Vĩnh An <ArrowRight size={13} /> Tân Hy</p></div></li>
    </ol>
    <p className={styles.groupLabel}>BỐN PHÁI CÒN LIÊN HỆ</p>
    <div className={styles.affiliations} role="group" aria-label="Bốn phái còn liên hệ">
      {branches.map(branch => onSelectBranch
        ? <button key={branch.id} type="button" aria-pressed={selectedBranchId === branch.id} onClick={() => onSelectBranch(branch.id)}><MapPin size={16} /><span><strong>{branch.name}</strong><small>{branch.detail}</small></span></button>
        : <div key={branch.id}><MapPin size={16} /><span><strong>{branch.name}</strong><small>{branch.detail}</small></span></div>)}
    </div>
    <p className={styles.diagramNote}>{onSelectBranch ? 'Chọn một phái để xem thông tin trong bài đọc.' : 'Các phái được ghi nhận trong gia phổ về sau.'}</p>
  </>;
}

function SourceComparison() {
  return <>
    <div className={styles.comparison}>
      <div><ChronicleBook /><strong>Hà Quan</strong></div>
      <span className={styles.comparisonMark}>Đối chiếu</span>
      <div><ChronicleBook variant={1} /><strong>Duy Phước</strong></div>
    </div>
    <div className={styles.metrics}><div><strong>235</strong><span>tên sao từ Tiếu thư</span></div><div><strong>32</strong><span>tên được ghi nhận trùng</span></div></div>
    <p className={styles.diagramNote}>Dấu trùng cần tiếp tục kiểm chứng; chưa xác lập quan hệ cha con giữa hai tộc.</p>
  </>;
}

function ChronicleTimeline() {
  return <ol className={styles.chronicles} aria-label="Các mốc biên soạn gia phổ">
    {[{ year: '1874', title: 'Tu diễn gia phổ', detail: 'Nguyễn Bỉnh Trai · từ hai bản Tiếu thư' }, { year: '1993', title: 'Biên soạn Quốc ngữ', detail: 'Các phái cùng gìn giữ tư liệu' }, { year: '2023', title: 'Gia phổ tiếp biên', detail: 'Hội đồng gia tộc' }].map((item, index) => <li key={item.year}>
      <ChronicleBook variant={index} /><div><span>{item.year}</span><strong>{item.title}</strong><small>{item.detail}</small></div>
    </li>)}
  </ol>;
}

function DigitalTree({ totalMembers, totalGenerations }: Pick<DiagramProps, 'totalMembers' | 'totalGenerations'>) {
  return <>
    <div className={styles.digitalHeader}><ScrollText size={22} /><span>Từ trang gia phổ</span><ArrowRight size={18} /><Sprout size={22} /><span>Cây gia phả số</span></div>
    <svg className={styles.digitalTree} viewBox="0 0 400 195" role="img" aria-label="Minh họa các thế hệ trong cây gia phả, không thể hiện quan hệ của cá nhân cụ thể">
      <rect x="16" y="8" width="368" height="178" rx="12" fill="#faf7ed" stroke="#b7c6b5" />
      <path d="M17 32H383" stroke="#d6ddcc" />
      {[31, 42, 53].map(x => <circle key={x} cx={x} cy="20" r="2.5" fill="#9eae93" />)}
      <path d="M200 68V89H112V108M200 89H288V108M112 133V146H69V159M112 146H155V159M288 133V146H245V159M288 146H331V159" fill="none" stroke="#a28953" strokeWidth="2" />
      {[[200, 56], [112, 119], [288, 119], [69, 165], [155, 165], [245, 165], [331, 165]].map(([x, y], index) => <g key={`${x}-${y}`}><rect x={x - 27} y={y - 12} width="54" height="25" rx="6" fill={index === 0 ? '#315e4c' : '#e0e8d6'} stroke="#6f8d6e" /><circle cx={x - 13} cy={y - 2} r="3" fill={index === 0 ? '#e9dcac' : '#55765c'} /><path d={`M${x - 18} ${y + 6}q5-8 10 0M${x - 1} ${y - 2}h16M${x - 1} ${y + 4}h11`} fill="none" stroke={index === 0 ? '#e9dcac' : '#55765c'} strokeWidth="1.5" /></g>)}
    </svg>
    {totalMembers !== undefined && totalGenerations !== undefined && <div className={styles.metrics}><div><strong>{totalMembers.toLocaleString('vi-VN')}</strong><span>thành viên được ghi nhận</span></div><div><strong>{totalGenerations}</strong><span>thế hệ trong dữ liệu</span></div></div>}
    <p className={styles.diagramNote}>Gìn giữ tên người, nối các thế hệ và lưu lại nguồn tư liệu.</p>
  </>;
}

export default function OriginChapterDiagram(props: DiagramProps) {
  return <div className={styles.diagram}>
    {props.chapter === 4 ? <BranchDiagram /> : props.chapter === 5 ? <Migration {...props} /> : props.chapter === 6 ? <BranchDiagram later /> : props.chapter === 7 ? <SourceComparison /> : props.chapter === 8 ? <ChronicleTimeline /> : <DigitalTree {...props} />}
  </div>;
}
