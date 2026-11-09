'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Landmark, MapPin, Search, ScrollText, Sprout } from 'lucide-react';
import { normalizeSearch } from '@/lib/family';
import tieuThuEntries from '@/data/tieu-thu-2023.json';
import styles from './HeritageArchive.module.css';

const branches = [
  { name: 'Hà Quan', place: 'Tam Tiến, Núi Thành', note: 'Chánh phái; các nhánh Đồng Chổi, Thạch Kiều và Thành Mỹ được ghi thuộc phái lớn Hà Quan.' },
  { name: 'Tân Hy', place: 'Bình Đông, Bình Sơn, Quảng Ngãi', note: 'Một trong các phái còn giữ liên hệ dòng họ theo bản gia phổ.' },
  { name: 'Sơn Trà', place: 'Bình Đông, Bình Sơn, Quảng Ngãi', note: 'Được ghi trong giai đoạn các nhánh chuyển cư vào Quảng Ngãi.' },
  { name: 'Núi Rướn', place: 'Bình Phục, Thăng Bình', note: 'Bản gia phổ gọi là Quý phái, tức phái út.' }
];

const memorialPoem = [
  'Cây có cội, nước có nguồn',
  'Tổ tiên Huỳnh tộc gốc từ Nghệ Thanh',
  'Hậu Lê thế sự thăng trầm',
  'Huỳnh gia Triệu tổ phải lìa cố hương',
  'Bước đường sinh kế viễn phương',
  'Dãi dầu mưa nắng dặm trường phong ba',
  'Cát Cạo một góc sơn hà',
  'Mênh mông biển cả, xanh dòng Trường Giang',
  'Đời ông trải lắm gian nan',
  'Sớm chiều sông nước dọc ngang biển trời',
  'Lo toan cuộc sống, việc đời',
  'Chiêu dân, lập nghiệp, dựng xây xóm làng',
  'Lập nên xã hiệu Hà Quan',
  'Tiền hiến bổn xử vẻ vang giống giòng',
  'Mặc cho cuộc sống long đong',
  'Một thời thanh bạch, nghĩa tình thủy chung',
  'Giữ gìn giềng mối gia phong',
  'Tình nhà nghĩa nước hiếu trung vẹn toàn',
  'Thương ông gian khổ muôn vàn',
  'Để cho dòng họ sống còn, hiển vinh',
  'Đến nay đã mấy trăm năm',
  'Mười ba thế hệ nối dòng tổ tông',
  'Ngãi Nam chung một cội nguồn',
  'Hà Quan, Núi Rướn, Tân Hy, Sơn Trà',
  'Nay con cháu gần xa sum họp',
  'Nhớ ơn ông công đức cao dày',
  'Dưới đài tưởng niệm tiên linh',
  'Xin nguyện trọn đạo hiếu trung đời đời.'
];

export default function HeritageArchive() {
  const [ritualQuery, setRitualQuery] = useState('');
  const ritualMatches = useMemo(() => {
    const query = normalizeSearch(ritualQuery);
    return query ? tieuThuEntries.filter(entry => normalizeSearch(entry.text).includes(query)) : tieuThuEntries;
  }, [ritualQuery]);
  const jumpTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return <section className={`${styles.archive} container`} aria-labelledby="heritage-title">
    <div className={styles.heading}>
      <span className="section-kicker">TỪ BẢN GIA PHỔ</span>
      <h2 id="heritage-title">Lịch sử, gia phong và tư liệu tế tự</h2>
      <p>Nội dung được trích lược từ tệp “Tân Gia phả chung 2023-08-31 09.32.43.docx”. Tệp này lưu lời tựa năm 1874, bản biên soạn năm 1993 và phần phả hệ. Các địa danh và câu chuyện dưới đây được trình bày theo lời bản gia phổ.</p>
    </div>

    <nav className={styles.contents} aria-label="Mục lục tư liệu">
      <button type="button" onClick={() => jumpTo('archive-preface')}>Lời nói đầu</button>
      <button type="button" onClick={() => jumpTo('archive-origin')}>Cội nguồn</button>
      <button type="button" onClick={() => jumpTo('archive-branches')}>Các phái</button>
      <button type="button" onClick={() => jumpTo('archive-connections')}>Duy Phước</button>
      <button type="button" onClick={() => jumpTo('archive-tradition')}>Gia phong</button>
      <button type="button" onClick={() => jumpTo('archive-eulogy')}>Điếu Tiền hiền</button>
      <button type="button" onClick={() => jumpTo('archive-ritual')}>Tiếu thư tế tự</button>
    </nav>

    <div className={styles.twoColumns}>
      <article className={styles.card} id="archive-preface">
        <div className={styles.icon}><BookOpen size={23} /></div>
        <span className={styles.source}>Lời nói đầu · 1993 · đoạn 2–16</span>
        <h3>Vì sao bản gia phổ được biên soạn?</h3>
        <p>Nhân dịp xây dựng nghĩa trang Huỳnh tộc, các phái mong muốn viết lại gia phổ bằng chữ Quốc ngữ để con cháu biết về tông môn. Nhóm biên soạn dựa vào bản gia phổ năm 1874, bản trích của phái Tân Hy và một số bản sao, gia phổ liên quan cùng chuyện kể trong họ.</p>
        <p>Người biên soạn ghi rõ khó khăn do tư liệu thất lạc, chữ Nôm khó phiên dịch và nhiều thế hệ chưa nối được đầy đủ. Bản gia phổ mời con cháu tiếp tục góp ý, tu chỉnh những chỗ chưa chính xác.</p>
      </article>
      <article className={styles.card}>
        <div className={styles.icon}><ScrollText size={23} /></div>
        <span className={styles.source}>Lời tựa dịch từ nguyên bản · 1874 · đoạn 114–123</span>
        <h3>Bản gia phổ và hai cuốn Tiếu thư</h3>
        <p>Lời tựa của tú tài Nguyễn Bỉnh Trai kể việc các vị trong tộc nhờ ông tu diễn gia phổ vào năm Giáp Tuất 1874. Khi đó, hai bản Tiếu thư chủ yếu dùng để tế tự, chưa ghi rõ thứ tự các đời và quan hệ sinh hạ.</p>
        <p>Vì không thể xác định đầy đủ phổ hệ, ông đặt riêng một bản trích ở đầu gia phổ để giữ lại tên người được thờ cúng. Đây là lý do danh sách tế tự bên dưới được lưu như tư liệu, không tự gắn thành các nút trong cây.</p>
      </article>
    </div>

    <article className={styles.story} id="archive-origin">
      <div>
        <span className={styles.source}>Lược sử tộc Huỳnh · đoạn 21–41</span>
        <h3>Từ lời truyền về cội nguồn đến vùng Hà Quan</h3>
        <p>Bản gia phổ nhắc công thức tế tự “Huỳnh tộc Giang Hạ quận” và phân biệt <strong>Thỉ tổ</strong> của một họ với <strong>Triệu tổ, Tiền hiền</strong> của một phái tộc tại địa phương. Theo gia phổ, ngài Huỳnh Văn Trường từ vùng Nhượng Bạn đi vào phương Nam, lập cư tại Cát Cạo, xây dựng Hà Bứa thôn, về sau là Hà Quan.</p>
        <p>Chuyện gia đình rời quê bằng thuyền, gặp bão và dạt tới nhiều nơi được ghi như một truyền thuyết của dòng họ. Bản gia phổ cũng ghi mộ ngài ở xóm Cây Bàng, thôn tư, xã Tam Tiến; tư liệu chưa có tọa độ để tạo điểm chỉ đường trên bản đồ.</p>
      </div>
      <div className={styles.storyMark} aria-hidden="true"><Sprout size={74} /><span>Nhớ về cội nguồn</span></div>
    </article>

    <section className={styles.branches} id="archive-branches" aria-labelledby="branch-title">
      <div className={styles.sectionHead}><Landmark size={25} /><div><span className={styles.source}>Các phái còn được nhắc trong gia phổ · đoạn 39–48</span><h3 id="branch-title">Những nhánh của dòng họ</h3></div></div>
      <p>Gia phổ mô tả quá trình từ Hà Bứa thôn, tách thành ba phái rồi tiếp tục chuyển cư. Địa danh dưới đây giữ theo cách ghi trong bản biên soạn năm 1993.</p>
      <div className={styles.branchGrid}>{branches.map(branch => <article className={styles.branch} key={branch.name}><h4>{branch.name}</h4><span><MapPin size={14} /> {branch.place}</span><p>{branch.note}</p></article>)}</div>
    </section>

    <article className={styles.connection} id="archive-connections">
      <span className={styles.source}>Mối quan hệ với tộc Huỳnh Tấn Duy Phước · đoạn 52–57</span>
      <h3>Dấu nối được người biên soạn tìm kiếm</h3>
      <p>Người biên soạn đối chiếu bản Tiếu thư, gia phổ của hai tộc Huỳnh ở Hà Quan và Duy Phước cùng các chuyện kể về cuộc di cư. Tài liệu ghi nhận một số tên trùng nhau và nêu nhận định rằng các phái có thể cùng một gốc trước khi phân tán. Đây là kết luận trong bản gia phổ, chưa đủ quan hệ cha mẹ để tự nối hai cây gia đình trên website.</p>
    </article>

    <article className={styles.tradition} id="archive-tradition">
      <span className={styles.source}>Những truyền thống gia phong · đoạn 59–62</span>
      <h3>Điều các thế hệ muốn giữ gìn</h3>
      <p>Bản gia phổ đề cao sự thuận hòa trong gia đình, tình nghĩa xóm làng, lòng nhân hậu, lối sống thanh bạch và sự gắn bó giữa những người cùng dòng họ dù ở xa nhau. Phần kết nhắc con cháu nhớ công đức tiền nhân và tiếp tục vun đắp truyền thống ấy.</p>
    </article>

    <div className={styles.twoColumns}>
      <details className={styles.details} id="archive-eulogy">
        <summary><span><span className={styles.source}>Hoàng Xuân Thọ · mùa thu Quý Dậu 1993 · đoạn 81–112</span><strong>Điếu Tiền hiền</strong><small>Mở để đọc toàn văn bài điếu</small></span></summary>
        <p className={styles.poem}>{memorialPoem.map((line, index) => <span key={index}>{line}</span>)}</p>
        <p className={styles.note}>Giữ nguyên cách ghi của bản Word, kể cả những từ có thể cần đối chiếu lại.</p>
      </details>
      <details className={styles.details}>
        <summary><span><span className={styles.source}>Chú thích bản gia phổ · đoạn 64–75</span><strong>Quy ước đọc bản giấy</strong><small>Mở để xem cách trình bày của nguyên bản</small></span></summary>
        <ul className={styles.rules}>
          <li>Gia phổ chia thành thời kỳ ở Hà Bứa thôn, thời kỳ tách ba phái và thời kỳ tách thành nhiều phái.</li>
          <li>Vị thứ được xếp theo A, B, C; tên người có con được gạch dưới.</li>
          <li>Tên con còn nghi ngờ được đặt trong ngoặc; bản giấy dùng chữ đậm và chữ lợt để phân biệt người còn sống và đã mất.</li>
        </ul>
        <p className={styles.note}>Đây là quy ước của bản giấy, không phải ký hiệu hiển thị trên cây gia phả số.</p>
      </details>
    </div>

    <section className={styles.ritual} id="archive-ritual" aria-labelledby="ritual-title">
      <span className={styles.source}>Bản trích sao từ Tiếu thư · đoạn 124–352</span>
      <h3 id="ritual-title">Danh sách dùng để tế tự</h3>
      <p>Bản gia phổ ghi danh sách gồm 235 vị vong nhân. Phần Word hiện đọc được <strong>{tieuThuEntries.length} dòng trích</strong>, gồm cả hai tên ở mục “Phụ tiên tế tự”; có dòng thiếu hoặc lặp chữ. Các tên được giữ nguyên để đối chiếu, chưa suy ra quan hệ họ hàng hay ngày giỗ.</p>
      <label className={styles.search}><Search size={18} /><input value={ritualQuery} onChange={event => setRitualQuery(event.target.value)} placeholder="Tìm tên trong bản Tiếu thư..." aria-label="Tìm tên trong bản Tiếu thư" /></label>
      <div className={styles.resultCount}>Tìm thấy {ritualMatches.length} dòng</div>
      <div className={styles.ritualList}>{ritualMatches.map(entry => <div className={styles.ritualEntry} key={entry.sourceParagraph}><span>{entry.text}</span><small>Đoạn {entry.sourceParagraph}</small></div>)}{!ritualMatches.length && <p className={styles.noResults}>Không tìm thấy tên phù hợp trong phần trích.</p>}</div>
    </section>
  </section>;
}
