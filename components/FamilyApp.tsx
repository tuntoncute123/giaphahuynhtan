'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BellRing, BookOpen, CalendarDays, Camera, ChevronDown, ChevronRight, ChevronUp, Download, Edit3, Heart, Landmark, Leaf, ListTree, MapPin, Menu, Minus, Move, Network, Plus, Search, ShieldCheck, Sprout, Trash2, TreePine, UserRound, Users, X } from 'lucide-react';
import type { ContentRecord, FamilyData, Member } from '@/lib/types';
import { byName, bySeniority, childrenOf, descendantsOf, displayYear, fullDate, generationOf, hasDuplicateName, lineageOf, matchesMember } from '@/lib/family';
import { addressFor } from '@/lib/kinship';
import ShrinesView from './ShrinesView';
import MemorialView from './MemorialView';
import MemberEditor from './MemberEditor';
import MemberProfile from './MemberProfile';
import NewsView, { NewsPostModal, CATEGORY_INFO, displayNewsDate } from './NewsView';

type View = 'home' | 'tree' | 'members' | 'shrines' | 'memorial' | 'documents' | 'news' | 'contact';
type FormState = Omit<Member, 'id' | 'createdAt'> & { id?: string };
type ContentFormState = Omit<ContentRecord, 'id' | 'createdAt'> & { id?: string };
const emptyForm: FormState = { fullName: '', aliases: [], birthOrder: null, gender: 'Nam', birthDate: '', deathDate: '', anniversary: null, birthPlace: '', currentPlace: '', home: { address: '', latitude: null, longitude: null }, homePublic: false, zaloPhone: '', zaloConsent: false, occupation: '', biography: '', fatherId: null, motherId: null, spouseIds: [], avatar: '' };
const nav: { id: View; label: string }[] = [
  { id: 'home', label: 'Trang chủ' }, { id: 'tree', label: 'Gia phả' }, { id: 'members', label: 'Thành viên' },
  { id: 'shrines', label: 'Nhà thờ' }, { id: 'memorial', label: 'Ngày giỗ' }, { id: 'news', label: 'Tin tức · Hoạt động' },
  { id: 'contact', label: 'Liên hệ' }
];
const pageTitle: Record<View, string> = { home: 'Trang chủ', tree: 'Cây gia phả', members: 'Thành viên dòng họ', shrines: 'Nhà thờ dòng họ', memorial: 'Ngày giỗ âm lịch', documents: 'Tư liệu dòng họ', news: 'Tin tức & Hoạt động dòng họ', contact: 'Liên hệ' };

function initials(name: string) { return name.split(' ').slice(-2).map(x => x[0]).join('').toUpperCase(); }
function Avatar({ person, size = 'normal' }: { person: Member; size?: 'normal' | 'large' | 'small' }) {
  return (
    <div className={`avatar avatar-${size} ${person.gender === 'Nữ' ? 'avatar-female' : ''}`}>
      {person.avatar ? <img src={person.avatar} alt="" /> : <span className="avatar-text">{initials(person.fullName)}</span>}
    </div>
  );
}
function Ornament() { return <span className="ornament" aria-hidden="true"><span />✦<span /></span>; }

export default function FamilyApp() {
  const [view, setView] = useState<View>('home');
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [contentEditing, setContentEditing] = useState<ContentFormState | null>(null);
  const [newsEditing, setNewsEditing] = useState<Partial<ContentRecord> | null>(null);
  const [focusTreeId, setFocusTreeId] = useState<string | null>(null);
  const members = data?.members || [];
  const selected = members.find(m => m.id === selectedId) || null;
  const generations = useMemo(() => members.length ? Math.max(...members.map(m => generationOf(m.id, members))) : 0, [members]);

  useEffect(() => {
    const applyHash = () => { const hash = window.location.hash.slice(1) as View; if (hash in pageTitle) setView(hash); };
    applyHash(); window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);
  useEffect(() => { const controller = new AbortController(); fetch('/api/family', { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(result => { setData(result); setServerError(''); }).catch(error => { if (error.name !== 'AbortError') setServerError('Không tải được dữ liệu gia phả. Vui lòng thử lại.'); }).finally(() => setLoading(false)); return () => controller.abort(); }, [authenticated]);
  useEffect(() => { fetch('/api/auth').then(r => r.json()).then(result => setAuthenticated(!!result.authenticated)).catch(() => {}); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); }, [toast]);
  const go = (next: View) => { setView(next); window.location.hash = next; setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const openPerson = (id: string) => { setSelectedId(id); };
  const beginAdd = () => { if (authenticated) setEditing({ ...emptyForm }); else setLoginOpen(true); };
  const logout = async () => { await fetch('/api/auth', { method: 'DELETE' }); setAuthenticated(false); setToast('Đã đăng xuất quản trị.'); };
  const save = async (form: FormState, avatarFile: File | null) => {
    let avatar = form.avatar;
    if (avatarFile) {
      const payload = new FormData(); payload.append('file', avatarFile);
      const upload = await fetch('/api/upload', { method: 'POST', body: payload }); const uploaded = await upload.json();
      if (!upload.ok) throw new Error(uploaded.error || 'Không tải được ảnh.'); avatar = uploaded.fileUrl;
    }
    const method = form.id ? 'PUT' : 'POST';
    const res = await fetch('/api/family', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, avatar }) });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Không lưu được thành viên.');
    setData(result); setEditing(null); setToast(form.id ? 'Đã cập nhật hồ sơ thành viên.' : 'Đã thêm thành viên vào gia phả.');
  };
  const remove = async (person: Member) => {
    if (!window.confirm(`Xóa hồ sơ ${person.fullName}? Quan hệ của người này trong các hồ sơ khác sẽ được gỡ bỏ.`)) return;
    const res = await fetch('/api/family', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: person.id }) });
    const result = await res.json();
    if (!res.ok) { setToast(result.error || 'Không thể xóa hồ sơ.'); return; }
    setData(result); setSelectedId(null); setToast('Đã xóa hồ sơ thành viên.');
  };
  const exportData = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'gia-pha-huynh-tan.json'; a.click(); URL.revokeObjectURL(url);
  };
  const saveContent = async (form: ContentFormState, file: File | null) => {
    let fileUrl = form.fileUrl;
    if (file) {
      const payload = new FormData(); payload.append('file', file);
      const upload = await fetch('/api/upload', { method: 'POST', body: payload }); const uploaded = await upload.json();
      if (!upload.ok) throw new Error(uploaded.error || 'Không tải được tệp.'); fileUrl = uploaded.fileUrl;
    }
    const res = await fetch('/api/content', { method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, fileUrl }) });
    const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Không lưu được nội dung.');
    setData(result); setContentEditing(null); setToast(form.kind === 'event' ? 'Đã lưu sự kiện.' : 'Đã lưu tư liệu.');
  };
  const removeContent = async (record: ContentRecord) => {
    if (!window.confirm(`Xóa “${record.title}”?`)) return;
    const res = await fetch('/api/content', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: record.id }) });
    const result = await res.json(); if (!res.ok) { setToast(result.error || 'Không xóa được nội dung.'); return; }
    setData(result); setToast('Đã xóa nội dung.');
  };

  return <>
    <header className="site-header">
      <div className="header-inner container">
        <button className="brand" onClick={() => go('home')} aria-label="Về trang chủ">
          <span className="brand-seal">Tổ</span><span className="brand-copy"><strong>Gia phả Huỳnh Tấn</strong><small>Tôn vinh cội nguồn · Gìn giữ truyền thống</small></span>
        </button>
        <nav className={`nav ${mobileOpen ? 'nav-open' : ''}`} aria-label="Điều hướng chính">
          {nav.map(item => <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => go(item.id)}>{item.label}</button>)}
        </nav>
        <button className="header-action" onClick={() => authenticated ? logout() : setLoginOpen(true)}><UserRound size={17} /> <span>{authenticated ? 'Đăng xuất' : 'Đăng nhập'}</span></button>
        <button className="menu-toggle" aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'} onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
      </div>
    </header>

    {view === 'home' && <>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="container hero-content">
          <span className="eyebrow">DÒNG HỌ HUỲNH TẤN</span>
          <h1>Dòng họ<br />là gốc rễ<br /><em>của mỗi chúng ta</em></h1>
          <p>Gìn giữ gia phả · Kết nối con cháu<br />Duy trì truyền thống · Vững bước tương lai</p>
          <button className="primary-btn brush-btn" onClick={() => go('tree')}>Khám phá gia phả <ArrowRight size={21} /></button>
        </div>
      </section>
      <section className="quick-links" aria-label="Khám phá">
        <div className="container quick-grid">
          {[
            { icon: <TreePine />, name: 'GIA PHẢ DÒNG HỌ', text: 'Xem sơ đồ, lịch sử của dòng họ', target: 'tree' as View },
            { icon: <Users />, name: 'THÀNH VIÊN', text: 'Danh sách con cháu trong dòng họ', target: 'members' as View },
            { icon: <Landmark />, name: 'NHÀ THỜ', text: 'Vị trí và ngày giỗ tại từng nơi', target: 'shrines' as View },
            { icon: <BellRing />, name: 'NGÀY GIỖ', text: 'Lịch âm và nhắc giỗ Zalo', target: 'memorial' as View },
            { icon: <Camera />, name: 'TIN TỨC & ẢNH HỌ', text: 'Hình ảnh giỗ, đi lễ, tiệc dòng họ', target: 'news' as View },
            { icon: <Leaf />, name: 'LIÊN HỆ', text: 'Góp ý, liên hệ với ban quản trị', target: 'contact' as View }
          ].map(x => <button className="quick-item" key={x.name} onClick={() => go(x.target)}><span className="quick-icon">{x.icon}</span><strong>{x.name}</strong><span>{x.text}</span></button>)}
        </div>
      </section>
      <section className="intro-section container">
        <div className="intro-art"><div className="round-art"><TreePine size={92} strokeWidth={1.2} /><span>Phúc đức lưu truyền</span></div><span className="flower flower-one">✿</span><span className="flower flower-two">✿</span></div>
        <div className="intro-copy"><span className="section-kicker">CỘI NGUỒN VÀ KẾT NỐI</span><h2>Mỗi nhánh cây là một câu chuyện</h2><Ornament /><p>Gia phả giúp chúng ta biết mình đến từ đâu, hiểu mối dây gắn bó giữa các thế hệ và gìn giữ những câu chuyện quý giá cho mai sau.</p><p>Hãy bắt đầu từ một cái tên, khám phá những người thân trong dòng họ và cùng bổ sung thông tin để cây gia đình ngày càng trọn vẹn.</p><button className="text-link" onClick={() => go('members')}>Gặp gỡ các thành viên <ArrowRight size={18} /></button></div>
      </section>
      <section className="home-news-section">
        <div className="container">
          <div className="home-news-header">
            <div>
              <span className="section-kicker">NHỊP SỐNG DÒNG HỌ</span>
              <h2>Hình ảnh & Tin tức mới nhất</h2>
              <p>Khoảnh khắc những ngày giỗ, đi lễ dâng hương và bữa tiệc họp mặt của con cháu Huỳnh Tấn Tộc.</p>
            </div>
            <div className="toolbar-actions">
              <button className="outline-btn" onClick={() => go('news')}>
                Xem tất cả ({data?.content?.filter(c => c.kind === 'event').length || 0}) <ArrowRight size={16} />
              </button>
              <button className="primary-btn" onClick={() => setNewsEditing({})}>
                <Camera size={16} /> Đăng ảnh mới
              </button>
            </div>
          </div>

          {data?.content?.filter(c => c.kind === 'event').length ? (
            <div className="home-news-grid">
              {data.content
                .filter(c => c.kind === 'event')
                .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt))
                .slice(0, 3)
                .map(item => {
                  const cat = item.category || 'khac';
                  const info = CATEGORY_INFO[cat];
                  const Icon = info.icon;
                  const thumb = item.fileUrl || (item.images && item.images[0]) || '';
                  return (
                    <div key={item.id} className="home-news-card" onClick={() => go('news')}>
                      <div className="home-news-thumb">
                        {thumb ? (
                          <img src={thumb} alt={item.title} loading="lazy" />
                        ) : (
                          <Camera size={38} />
                        )}
                        <span
                          className="home-news-badge"
                          style={{ color: info.color, backgroundColor: info.bg }}
                        >
                          <Icon size={12} />
                          {info.shortLabel}
                        </span>
                      </div>
                      <div className="home-news-body">
                        <h3>{item.title}</h3>
                        {item.description && <p>{item.description}</p>}
                        <span className="home-news-date">
                          <CalendarDays size={12} />
                          {displayNewsDate(item.date)}
                          {item.author && ` · ${item.author}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="empty-news-state">
              <div className="empty-icon-circle"><Camera size={36} /></div>
              <h3>Chưa có bài viết nào</h3>
              <p>Hãy là người đầu tiên chia sẻ hình ảnh ngày giỗ, đi lễ hoặc tiệc họp họ của gia đình!</p>
              <button className="primary-btn" onClick={() => setNewsEditing({})}>
                <Plus size={16} /> Đăng ảnh & Tin tức đầu tiên
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="home-numbers"><div className="container"><div className="section-center"><span className="section-kicker">GIA PHẢ SỐ</span><h2>Gìn giữ ký ức qua từng thế hệ</h2><Ornament /></div><div className="number-grid"><div><strong>{members.length}</strong><span>Thành viên trong cây</span></div><div><strong>{generations}</strong><span>Thế hệ trong cây</span></div><div><strong>{members.filter(m => !m.fatherId && !m.motherId).length}</strong><span>Nhánh khởi đầu</span></div></div><p className="demo-note">Dữ liệu ban đầu là ví dụ minh họa; hãy thay bằng thông tin gia đình đã được xác nhận.</p></div></section>
    </>}

    {view !== 'home' && <section className="page-banner"><div className="container"><span className="breadcrumb" onClick={() => go('home')}>Trang chủ <ChevronRight size={14} /> {pageTitle[view]}</span><h1>{pageTitle[view]}</h1><Ornament /><p>{view === 'tree' ? 'Theo dấu cội nguồn, khám phá mối liên kết giữa các thế hệ.' : view === 'members' ? 'Mỗi thành viên là một phần không thể thiếu của câu chuyện dòng họ.' : 'Cùng gìn giữ những giá trị và kỷ niệm của dòng họ.'}</p></div></section>}

    <main>
      {loading && <div className="loading container">Đang tải gia phả...</div>}
      {serverError && <div className="error-box container">{serverError}</div>}
      {!loading && !serverError && view === 'tree' && <TreeView members={members} openPerson={openPerson} addMember={beginAdd} focusTreeId={focusTreeId} onFocusTreeId={setFocusTreeId} />}
      {!loading && !serverError && view === 'members' && <MembersView members={members} openPerson={openPerson} addMember={beginAdd} exportData={exportData} />}
      {!loading && !serverError && data && view === 'shrines' && <ShrinesView data={data} authenticated={authenticated} onData={setData} onLogin={() => setLoginOpen(true)} onToast={setToast} />}
      {!loading && !serverError && data && view === 'memorial' && <MemorialView data={data} authenticated={authenticated} onData={setData} onLogin={() => setLoginOpen(true)} onToast={setToast} openPerson={openPerson} />}
      {view === 'documents' && <ContentView kind="document" records={data?.content || []} authenticated={authenticated} add={() => authenticated ? setContentEditing({ kind: 'document', title: '', description: '', date: '', location: '', fileUrl: '' }) : setLoginOpen(true)} edit={record => setContentEditing({ ...record })} remove={removeContent} />}
      {view === 'news' && (
        <NewsView
          records={data?.content || []}
          authenticated={authenticated}
          onOpenCreate={() => setNewsEditing({})}
          onOpenEdit={record => setNewsEditing(record)}
          onRemove={removeContent}
        />
      )}
      {view === 'contact' && <ContactView />}
    </main>

    <footer className="footer"><div className="container footer-grid"><div><div className="footer-brand"><span className="brand-seal">Tổ</span><strong>Gia phả Huỳnh Tấn</strong></div><p>Gìn giữ cội nguồn, kết nối hôm nay<br />và trao truyền cho mai sau.</p></div><div><h3>Khám phá</h3><button onClick={() => go('tree')}>Cây gia phả</button><button onClick={() => go('members')}>Thành viên</button><button onClick={() => go('shrines')}>Nhà thờ</button><button onClick={() => go('memorial')}>Ngày giỗ</button></div><div><h3>Kết nối</h3><button onClick={() => go('documents')}>Tư liệu</button><button onClick={() => go('news')}>Tin tức · Hoạt động</button><button onClick={() => go('contact')}>Liên hệ</button></div><div className="footer-mark">福</div></div><div className="container footer-bottom">© {new Date().getFullYear()} Gia phả Huỳnh Tấn · Gìn giữ truyền thống gia đình</div></footer>
    {selected && <MemberProfile person={selected} members={members} authenticated={authenticated} close={() => setSelectedId(null)} openPerson={openPerson} edit={() => { setSelectedId(null); setEditing({ ...selected }); }} remove={() => remove(selected)} goTree={() => { const id = selected.id; setSelectedId(null); setFocusTreeId(id); go('tree'); }} />}
    {editing && <MemberEditor initial={editing} members={members} close={() => setEditing(null)} save={save} />}
    {contentEditing && <ContentForm initial={contentEditing} close={() => setContentEditing(null)} save={saveContent} />}
    {newsEditing && (
      <NewsPostModal
        initial={newsEditing}
        close={() => setNewsEditing(null)}
        onSaved={(saved, fullData) => {
          if (fullData?.members) {
            setData(fullData);
          } else {
            setData(prev => prev ? {
              ...prev,
              content: [saved, ...prev.content.filter(c => c.id !== saved.id)]
            } : prev);
          }
          setToast('Đã lưu bài viết và hình ảnh thành công!');
        }}
      />
    )}
    {loginOpen && <LoginModal close={() => setLoginOpen(false)} success={() => { setAuthenticated(true); setLoginOpen(false); setToast('Đã đăng nhập quản trị.'); }} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </>;
}

function MemberSearchSelect({
  label,
  placeholder,
  selectedId,
  onSelect,
  members,
}: {
  label: string;
  placeholder: string;
  selectedId: string;
  onSelect: (id: string) => void;
  members: Member[];
}) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMember = useMemo(
    () => members.find(m => m.id === selectedId),
    [members, selectedId]
  );

  useEffect(() => {
    function handleClickOutside(e: Event) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const q = query.trim();
    if (!q) {
      return [...members].sort(byName).slice(0, 15);
    }
    return members.filter(m => matchesMember(m, q)).slice(0, 15);
  }, [members, query]);

  return (
    <div className="member-search-select" ref={containerRef}>
      <span className="member-search-label">{label}</span>
      <div className="member-search-box">
        {selectedMember ? (
          <div className="selected-member-pill" onClick={() => setIsOpen(true)}>
            <Avatar person={selectedMember} size="small" />
            <div className="selected-info">
              <div className="selected-title-row">
                <strong>{selectedMember.fullName}</strong>
                <span className="selected-gen-badge">Đời {generationOf(selectedMember.id, members)}</span>
                {hasDuplicateName(selectedMember, members) && (
                  <span className="duplicate-tag" title="Tên này có người trùng trong dòng họ">Trùng tên</span>
                )}
              </div>
              <small className="selected-lineage">
                {lineageOf(selectedMember, members) || (selectedMember.birthDate ? `(${displayYear(selectedMember.birthDate)})` : '')}
              </small>
            </div>
            <button
              type="button"
              className="clear-select-btn"
              title="Đổi người khác"
              onClick={e => {
                e.stopPropagation();
                onSelect('');
                setQuery('');
                setIsOpen(true);
              }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="search-input-inner">
            <Search size={15} className="input-search-icon" />
            <input
              type="text"
              value={query}
              placeholder={placeholder}
              onFocus={() => setIsOpen(true)}
              onChange={e => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
            />
            {query && (
              <button
                type="button"
                className="clear-search-btn"
                title="Xóa tìm kiếm"
                onClick={() => {
                  setQuery('');
                  onSelect('');
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {isOpen && (
          <div className="member-search-dropdown">
            {filteredMembers.length > 0 ? (
              filteredMembers.map(m => (
                <button
                  type="button"
                  key={m.id}
                  className={`search-dropdown-item ${m.id === selectedId ? 'active' : ''}`}
                  onClick={() => {
                    onSelect(m.id);
                    setIsOpen(false);
                    setQuery('');
                  }}
                >
                  <Avatar person={m} size="small" />
                  <div className="item-text">
                    <div className="item-title-row">
                      <strong>{m.fullName}</strong>
                      <span className="item-gen-tag">Đời {generationOf(m.id, members)}</span>
                      {hasDuplicateName(m, members) && (
                        <span className="duplicate-tag" title="Tên này có người trùng trong dòng họ">Trùng tên</span>
                      )}
                    </div>
                    {lineageOf(m, members) && (
                      <span className="item-lineage-text">{lineageOf(m, members)}</span>
                    )}
                    <small className="item-meta-sub">
                      {m.aliases?.length ? `Biệt danh: ${m.aliases.join(', ')} · ` : ''}
                      {m.birthDate ? `(${displayYear(m.birthDate)}${m.deathDate ? ` – ${displayYear(m.deathDate)}` : ''})` : ''}
                    </small>
                  </div>
                </button>
              ))
            ) : (
              <div className="search-dropdown-empty">
                Không tìm thấy ai có tên &quot;{query}&quot;
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const ORDINAL_NAMES: Record<number, string> = {
  1: 'Hai', 2: 'Ba', 3: 'Tư', 4: 'Năm', 5: 'Sáu',
  6: 'Bảy', 7: 'Tám', 8: 'Chín', 9: 'Mười', 10: 'Mười Một'
};

function VerticalTreeNode({
  person,
  members,
  openPerson,
  expandedIds,
  toggleExpand,
  visited,
  maxGen,
}: {
  person: Member;
  members: Member[];
  openPerson: (id: string) => void;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
  visited: Set<string>;
  maxGen: number;
}): React.ReactNode {
  if (visited.has(person.id) || generationOf(person.id, members) > maxGen) return null;
  const next = new Set(visited).add(person.id);
  const spouse = person.spouseIds.map(id => members.find(m => m.id === id)).filter((x): x is Member => !!x);
  spouse.forEach(s => next.add(s.id));
  const children = childrenOf(person.id, members);
  const uniqueChildren = children.filter((m, i) => children.findIndex(c => c.id === m.id) === i);
  const isExpanded = expandedIds.has(person.id);
  const canExpand = uniqueChildren.length > 0 && generationOf(person.id, members) < maxGen;
  const gen = generationOf(person.id, members);
  const ordinalLabel = person.birthOrder && ORDINAL_NAMES[person.birthOrder] ? `Thứ ${ORDINAL_NAMES[person.birthOrder]}` : person.birthOrder ? `Thứ ${person.birthOrder}` : null;

  return (
    <div className="vtree-node" key={person.id}>
      <div className="vtree-card-row">
        <button
          type="button"
          className="vtree-card"
          onClick={() => openPerson(person.id)}
        >
          <Avatar person={person} size="small" />
          <div className="vtree-info">
            <div className="vtree-name-line">
              <strong className="vtree-name">{person.fullName}</strong>
              <span className="vtree-gen-badge">Đời {gen}</span>
              {ordinalLabel && <span className="vtree-order-badge">{ordinalLabel}</span>}
            </div>
            <div className="vtree-meta">
              <span>{displayYear(person.birthDate)} {person.deathDate ? `– ${displayYear(person.deathDate)}` : '– nay'}</span>
              {spouse.length > 0 && (
                <span className="vtree-spouse">
                  <Heart size={10} fill="currentColor" /> {spouse.map(s => `${s.gender === 'Nữ' ? 'Vợ' : 'Chồng'}: ${s.fullName}`).join(', ')}
                </span>
              )}
            </div>
          </div>
        </button>

        {canExpand && (
          <button
            type="button"
            className={`vtree-toggle-btn ${isExpanded ? 'expanded' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(person.id);
            }}
            title={isExpanded ? 'Thu gọn nhánh con' : `Mở rộng ${uniqueChildren.length} người con`}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={15} />
                <span>Thu gọn</span>
              </>
            ) : (
              <>
                <ChevronDown size={15} />
                <span>{uniqueChildren.length} con</span>
              </>
            )}
          </button>
        )}
      </div>

      {canExpand && isExpanded && (
        <div className="vtree-children-list">
          {uniqueChildren.map(child => (
            <VerticalTreeNode
              key={child.id}
              person={child}
              members={members}
              openPerson={openPerson}
              expandedIds={expandedIds}
              toggleExpand={toggleExpand}
              visited={next}
              maxGen={maxGen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeView({
  members,
  openPerson,
  addMember,
  focusTreeId,
  onFocusTreeId
}: {
  members: Member[];
  openPerson: (id: string) => void;
  addMember: () => void;
  focusTreeId: string | null;
  onFocusTreeId: (id: string | null) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [maxGen, setMaxGen] = useState(99);
  const [rootId, setRootId] = useState('all');
  const [filterName, setFilterName] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');

  const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
  const [finderOpenMobile, setFinderOpenMobile] = useState(false);

  useEffect(() => {
    // Tự động chuyển sang phả đồ dọc trên màn hình điện thoại
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setViewMode('list');
    }
  }, []);

  const filterContainerRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: Event) {
      if (filterContainerRef.current && !filterContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Drag to pan state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const hasDraggedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click
    const el = scrollRef.current;
    if (!el) return;
    setIsPanning(true);
    hasDraggedRef.current = false;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning || !scrollRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDraggedRef.current = true;
    }
    scrollRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    scrollRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 60);
  };

  // Zoom handlers: min 10% (0.1), max 200% (2.0)
  const zoomIn = () => setZoom(z => Math.min(2.0, +(z < 0.3 ? z + 0.05 : z + 0.1).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.1, +(z <= 0.3 ? z - 0.05 : z - 0.1).toFixed(2)));
  const zoomReset = () => setZoom(1);
  const zoomOverview = () => setZoom(0.2);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else zoomOut();
    }
  };

  // If focusTreeId is active, show only that person and their descendants downwards
  const focusPerson = focusTreeId ? members.find(m => m.id === focusTreeId) : null;

  // Autocomplete matching members by name
  const matchingMembers = useMemo(() => {
    if (!filterName.trim()) return [];
    if (focusPerson && filterName.trim() === focusPerson.fullName.trim()) return [];
    return members.filter(m => matchesMember(m, filterName)).slice(0, 12);
  }, [filterName, members, focusPerson]);

  const roots = members.filter(m => !m.fatherId && !m.motherId && !m.spouseIds.some(s => {
    const spouse = members.find(x => x.id === s);
    return spouse && (spouse.fatherId || spouse.motherId || spouse.gender === 'Nam' && m.gender !== 'Nam');
  })).sort(bySeniority);
  const options = roots.length ? roots : members.filter(m => !m.fatherId && !m.motherId);

  const shown = focusPerson
    ? [focusPerson]
    : rootId === 'all'
    ? options
    : options.filter(m => m.id === rootId);

  const totalGen = members.length ? Math.max(...members.map(m => generationOf(m.id, members))) : 1;
  const address = fromId && toId ? addressFor(fromId, toId, members) : null;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // Tự động mở rộng 2 đời đầu khi khởi tạo
  useEffect(() => {
    if (members.length > 0) {
      setExpandedIds(prev => {
        if (prev.size > 0) return prev;
        const initial = new Set<string>();
        roots.forEach(r => {
          initial.add(r.id);
          childrenOf(r.id, members).forEach(c => initial.add(c.id));
        });
        return initial;
      });
    }
  }, [members, roots]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allWithChildren = members.filter(m => childrenOf(m.id, members).length > 0).map(m => m.id);
    setExpandedIds(new Set(allWithChildren));
  };

  const collapseToRoot = () => {
    setExpandedIds(new Set(roots.map(r => r.id)));
  };

  useEffect(() => {
    if (focusTreeId) {
      const desc = descendantsOf(focusTreeId, members).map(m => m.id);
      setExpandedIds(prev => new Set([...prev, focusTreeId, ...desc]));
    }
  }, [focusTreeId, members]);

  const scrollToRoot = () => {
    setZoom(1);
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollTo({
        left: (el.scrollWidth - el.clientWidth) / 2,
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const renderNode = (person: Member, visited: Set<string>): React.ReactNode => {
    if (visited.has(person.id) || generationOf(person.id, members) > maxGen) return null;
    const next = new Set(visited).add(person.id);
    const spouse = person.spouseIds.map(id => members.find(m => m.id === id)).filter((x): x is Member => !!x);
    spouse.forEach(s => next.add(s.id));
    const children = childrenOf(person.id, members);
    const uniqueChildren = children.filter((m, i) => children.findIndex(c => c.id === m.id) === i);

    return (
      <div className="tree-node" key={person.id}>
        <div className="tree-pair">
          <button
            className="tree-card"
            onClick={() => {
              if (!hasDraggedRef.current) openPerson(person.id);
            }}
          >
            <span className="generation-badge">Đời {generationOf(person.id, members)}</span>
            <Avatar person={person} size="small" />
            <strong>{person.fullName}</strong>
            <span>{displayYear(person.birthDate)} {person.deathDate ? `– ${displayYear(person.deathDate)}` : '– nay'}</span>
          </button>
          {spouse.map(s => (
            <button
              className="tree-card spouse-card"
              key={s.id}
              onClick={() => {
                if (!hasDraggedRef.current) openPerson(s.id);
              }}
            >
              <span className="spouse-heart"><Heart size={12} fill="currentColor" /> {s.gender === 'Nữ' ? 'Vợ' : 'Chồng'}</span>
              <Avatar person={s} size="small" />
              <strong>{s.fullName}</strong>
              <span>{displayYear(s.birthDate)} {s.deathDate ? `– ${displayYear(s.deathDate)}` : '– nay'}</span>
            </button>
          ))}
        </div>
        {uniqueChildren.length > 0 && generationOf(person.id, members) < maxGen && (
          <div className="tree-children">
            {uniqueChildren.map(child => renderNode(child, next))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="tree-section container">
      <div className="section-toolbar">
        <div>
          <span className="section-kicker">SƠ ĐỒ DÒNG HỌ</span>
          <h2>Cây gia phả Huỳnh Tấn</h2>
          <p>Chọn một thành viên để xem hồ sơ hoặc lọc xem một nhánh gia đình từ người đó đổ xuống.</p>
        </div>
        <button className="primary-btn" onClick={addMember}>
          <Plus size={17} /> Thêm thành viên
        </button>
      </div>

      <div className="relationship-finder">
        <div className="relationship-heading" onClick={() => setFinderOpenMobile(o => !o)}>
          <Heart size={20} />
          <div>
            <strong>Nên gọi bằng vai vế gì?</strong>
            <span>Gõ tìm kiếm bản thân và người muốn xưng hô để tra cứu cách gọi chính xác theo dòng họ.</span>
          </div>
          <button type="button" className="mobile-finder-toggle-btn" aria-label="Đóng/Mở tra cứu vai vế">
            {finderOpenMobile ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
        <div className={`relationship-body ${finderOpenMobile || address ? 'mobile-open' : ''}`}>
          <div className="relationship-fields">
            <MemberSearchSelect
              label="Tôi là:"
              placeholder="Gõ tìm tên bạn..."
              selectedId={fromId}
              onSelect={setFromId}
              members={members}
            />
            <ArrowRight size={20} className="relationship-arrow" />
            <MemberSearchSelect
              label="Tôi muốn gọi:"
              placeholder="Gõ tìm người muốn xưng hô..."
              selectedId={toId}
              onSelect={setToId}
              members={members}
            />
          </div>
          {address && (
            <div className="relationship-result">
              <div className="relationship-term-box">
                <span>Nên gọi là:</span>
                <strong className="term-highlight">{address.term}</strong>
                {address.reciprocal && (
                  <span className="reciprocal-tag">
                    (Xưng hô lại: <em>{address.reciprocal}</em>)
                  </span>
                )}
              </div>
              <small className="explanation-text">{address.explanation}</small>
            </div>
          )}
        </div>
      </div>

      {/* Tab chuyển đổi chế độ xem: chỉ hiển thị trên điện thoại */}
      <div className="mobile-view-tabs">
        <button
          type="button"
          className={`view-tab-btn ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          <ListTree size={16} /> Phả đồ dọc (Dễ đọc)
        </button>
        <button
          type="button"
          className={`view-tab-btn ${viewMode === 'canvas' ? 'active' : ''}`}
          onClick={() => setViewMode('canvas')}
        >
          <Network size={16} /> Sơ đồ ngang
        </button>
      </div>

      <div className="tree-panel">
        <div className="tree-controls">
          <div className="tree-filters">
            {/* Lọc xem cây từ một người cụ thể đổ xuống */}
            <div className="tree-name-filter" ref={filterContainerRef}>
              <span className="tree-filter-label">Lọc từ người:</span>
              {focusPerson ? (
                <div className="tree-selected-pill">
                  <Avatar person={focusPerson} size="small" />
                  <div className="tree-selected-info">
                    <strong>{focusPerson.fullName}</strong>
                    <small>Đời {generationOf(focusPerson.id, members)}</small>
                  </div>
                  <button
                    type="button"
                    className="clear-tree-pill-btn"
                    title="Xem lại toàn bộ cây"
                    onClick={() => {
                      onFocusTreeId(null);
                      setFilterName('');
                      setDropdownOpen(false);
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div className="tree-search-input-wrap">
                  <Search size={15} />
                  <input
                    id="tree-filter-input"
                    ref={filterInputRef}
                    type="text"
                    value={filterName}
                    placeholder="Tìm tên để xem nhánh..."
                    onChange={e => {
                      setFilterName(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setDropdownOpen(false);
                        filterInputRef.current?.blur();
                      }
                    }}
                  />
                  {filterName && (
                    <button
                      type="button"
                      className="clear-filter-icon"
                      title="Xóa tìm kiếm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFilterName('');
                        setDropdownOpen(false);
                        filterInputRef.current?.blur();
                      }}
                    >
                      <X size={14} />
                    </button>
                  )}
                  {dropdownOpen && matchingMembers.length > 0 && (
                    <div className="tree-filter-dropdown">
                      {matchingMembers.map(m => (
                        <button
                          type="button"
                          key={m.id}
                          className="tree-dropdown-item"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onFocusTreeId(m.id);
                            setFilterName('');
                            setDropdownOpen(false);
                            filterInputRef.current?.blur();
                          }}
                        >
                          <Avatar person={m} size="small" />
                          <div className="tree-dropdown-item-info">
                            <div className="tree-item-title-row">
                              <strong>{m.fullName}</strong>
                              <span className="tree-item-gen-tag">Đời {generationOf(m.id, members)}</span>
                              {hasDuplicateName(m, members) && (
                                <span className="duplicate-tag" title="Tên này có người trùng trong dòng họ">Trùng tên</span>
                              )}
                            </div>
                            {lineageOf(m, members) && (
                              <span className="tree-item-lineage">{lineageOf(m, members)}</span>
                            )}
                            <small className="tree-item-children-count">
                              {childrenOf(m.id, members).length} con trực hệ
                              {m.birthDate ? ` · (${displayYear(m.birthDate)}${m.deathDate ? ` – ${displayYear(m.deathDate)}` : ''})` : ''}
                            </small>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {!focusTreeId && (
              <label>Nhánh gia đình
                <span className="select-wrap">
                  <select value={rootId} onChange={e => setRootId(e.target.value)}>
                    <option value="all">Tất cả nhánh</option>
                    {options.map(m => <option value={m.id} key={m.id}>{m.fullName}</option>)}
                  </select>
                  <ChevronDown size={15} />
                </span>
              </label>
            )}

            <label>Hiển thị đến
              <span className="select-wrap">
                <select value={maxGen} onChange={e => setMaxGen(Number(e.target.value))}>
                  <option value={99}>Tất cả đời</option>
                  {Array.from({ length: totalGen }, (_, i) => i + 1).map(n => (
                    <option value={n} key={n}>Đời thứ {n}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </span>
            </label>
          </div>

          {viewMode === 'canvas' && (
            <div className="zoom-controls">
              <button aria-label="Thu nhỏ" title="Thu nhỏ (tối thiểu 10%)" onClick={zoomOut}><Minus size={17} /></button>
              <span title="Tỉ lệ hiện tại">{Math.round(zoom * 100)}%</span>
              <button aria-label="Phóng to" title="Phóng to (tối đa 200%)" onClick={zoomIn}><Plus size={17} /></button>
              <button title="Thu nhỏ toàn cảnh (20%)" onClick={zoomOverview}>20%</button>
              <button title="Đặt lại kích thước chuẩn (100%)" onClick={zoomReset}>100%</button>
              <button title="Cuộn về Cụ Tổ Đời 1" className="zoom-root-btn" onClick={scrollToRoot}>
                <Sprout size={15} /> <span>Về Cụ Tổ</span>
              </button>
            </div>
          )}
        </div>

        {focusPerson && (
          <div className="tree-focus-banner">
            <div className="focus-info">
              <Sprout size={18} />
              <span>
                Đang xem cây từ: <strong>{focusPerson.fullName}</strong> (Đời thứ {generationOf(focusPerson.id, members)})
                {' · '}Có <strong>{descendantsOf(focusPerson.id, members).length}</strong> hậu duệ trực hệ đổ xuống
              </span>
            </div>
            <button
              type="button"
              className="clear-focus-btn"
              onClick={() => {
                onFocusTreeId(null);
                setFilterName('');
                setDropdownOpen(false);
              }}
            >
              <X size={15} /> Xem lại toàn bộ cây
            </button>
          </div>
        )}

        {viewMode === 'list' ? (
          <div className="vtree-container">
            <div className="vtree-toolbar">
              <span className="vtree-count-text">
                Hiển thị <strong>{shown.length}</strong> nhánh chính · <strong>{members.length}</strong> thành viên
              </span>
              <div className="vtree-actions">
                <button type="button" className="vtree-action-btn" onClick={expandAll}>
                  <Plus size={13} /> Mở tất cả
                </button>
                <button type="button" className="vtree-action-btn" onClick={collapseToRoot}>
                  <Minus size={13} /> Thu gọn về Đời 2
                </button>
              </div>
            </div>
            <div className="vtree-list">
              {shown.length ? (
                shown.map(root => (
                  <VerticalTreeNode
                    key={root.id}
                    person={root}
                    members={members}
                    openPerson={openPerson}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    visited={new Set()}
                    maxGen={maxGen}
                  />
                ))
              ) : (
                <div className="empty-state">Chưa có dữ liệu gia phả.</div>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`tree-scroll ${isPanning ? 'is-panning' : ''}`}
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <div
              className="tree-canvas"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center'
              }}
            >
              {shown.length ? shown.map(root => renderNode(root, new Set())) : <div className="empty-state">Chưa có dữ liệu gia phả.</div>}
            </div>

            <button
              type="button"
              className="scroll-to-root-btn"
              title="Cuộn về Cụ Tổ Đời 1"
              onClick={scrollToRoot}
            >
              <Sprout size={15} /> <span>Về Cụ Tổ</span>
            </button>
          </div>
        )}

        <div className="tree-legend">
          <span><i className="legend-dot" /> Thành viên dòng họ</span>
          <span><Heart size={14} /> Vợ / Chồng</span>
          <span><Move size={14} /> <strong>Giữ chuột và kéo</strong> để di chuyển trên cây</span>
          <span>Giữ <strong>Ctrl + cuộn chuột</strong> để thu phóng</span>
        </div>
      </div>

      <div className="tree-hint">
        <Sprout size={25} />
        <div>
          <strong>Góp một nhánh, giữ trọn cội nguồn</strong>
          <p>Thêm thông tin cha, mẹ hoặc vợ/chồng khi tạo hồ sơ để thành viên xuất hiện đúng vị trí trong cây.</p>
        </div>
        <button className="text-link" onClick={addMember}>
          Bổ sung thành viên <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );
}

function MembersView({ members, openPerson, addMember, exportData }: { members: Member[]; openPerson: (id: string) => void; addMember: () => void; exportData: () => void }) {
  const [search, setSearch] = useState(''); const [generation, setGeneration] = useState('all'); const [gender, setGender] = useState('all');
  const gens = members.length ? Math.max(...members.map(m => generationOf(m.id, members))) : 0;
  const filtered = members.filter(m => matchesMember(m, search) && (generation === 'all' || generationOf(m.id, members) === Number(generation)) && (gender === 'all' || m.gender === gender)).sort((a,b) => generationOf(a.id,members) - generationOf(b.id,members) || bySeniority(a,b));
  return <section className="members-section container"><div className="section-toolbar"><div><span className="section-kicker">DANH SÁCH DÒNG HỌ</span><h2>Gương mặt qua các thế hệ</h2><p>Tìm kiếm, xem quan hệ và cập nhật thông tin thành viên.</p></div><div className="toolbar-actions"><button className="outline-btn" onClick={exportData}><Download size={17} /> Xuất dữ liệu</button><button className="primary-btn" onClick={addMember}><Plus size={17} /> Thêm thành viên</button></div></div><div className="directory-filters"><div className="search-box"><Search size={19} /><input aria-label="Tìm thành viên" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, biệt danh, ví dụ: cô Bảy..." /></div><div className="select-wrap"><select aria-label="Lọc theo đời" value={generation} onChange={e => setGeneration(e.target.value)}><option value="all">Tất cả đời</option>{Array.from({ length: gens }, (_, i) => i+1).map(n => <option key={n} value={n}>Đời thứ {n}</option>)}</select><ChevronDown size={16} /></div><div className="select-wrap"><select aria-label="Lọc theo giới tính" value={gender} onChange={e => setGender(e.target.value)}><option value="all">Tất cả</option><option>Nam</option><option>Nữ</option><option>Khác</option></select><ChevronDown size={16} /></div></div><div className="result-count">Hiển thị <strong>{filtered.length}</strong> / {members.length} thành viên</div><div className="member-grid">{filtered.map(m => <button className="member-card" key={m.id} onClick={() => openPerson(m.id)}><div className="member-card-top"><Avatar person={m} /><span className="pill">Đời thứ {generationOf(m.id, members)}</span></div><h3>{m.fullName}</h3>{m.aliases.length > 0 && <div className="member-aliases">{m.aliases.slice(0, 2).join(" · ")}</div>}<p>{displayYear(m.birthDate)} {m.deathDate ? `– ${displayYear(m.deathDate)}` : '– nay'}</p><div className="member-card-meta"><span><MapPin size={14} /> {m.birthPlace || 'Chưa cập nhật quê quán'}</span><span><Users size={14} /> {childrenOf(m.id,members).length} người con</span></div><span className="card-link">Xem hồ sơ <ArrowRight size={16} /></span></button>)}</div>{!filtered.length && <div className="empty-state">Không tìm thấy thành viên phù hợp. Hãy thử bộ lọc khác.</div>}<p className="demo-note">Dữ liệu được trích lục và đối chiếu theo cuốn Phụng dịch quốc ngữ Huỳnh Tấn Tộc.</p></section>;
}

function LoginModal({ close, success }: { close: () => void; success: () => void }) {
  const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) }); const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Không thể đăng nhập.'); success(); } catch (err) { setError(err instanceof Error ? err.message : 'Không thể đăng nhập.'); } finally { setBusy(false); } };
  return <div className="modal-backdrop" onMouseDown={close}><form className="login-modal" role="dialog" aria-modal="true" aria-label="Đăng nhập quản trị" onMouseDown={e => e.stopPropagation()} onSubmit={submit}><button type="button" className="modal-close" onClick={close} aria-label="Đóng"><X size={20} /></button><div className="login-mark">Tổ</div><span className="section-kicker">QUẢN TRỊ GIA PHẢ</span><h2>Đăng nhập</h2><p>Nhập tài khoản quản trị để bổ sung và chỉnh sửa hồ sơ dòng họ.</p><label>Tên đăng nhập<input type="text" autoFocus required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="Nhập tên đăng nhập" /></label><label>Mật khẩu quản trị<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Nhập mật khẩu" /></label>{error && <div className="form-error" role="alert">{error}</div>}<button className="primary-btn" disabled={busy} type="submit">{busy ? 'Đang đăng nhập...' : 'Đăng nhập'} <ArrowRight size={16} /></button></form></div>;
}

function ContactView() { return <section className="contact-section container"><div><span className="section-kicker">CÙNG GÌN GIỮ GIA PHẢ</span><h2>Mỗi thông tin bạn chia sẻ đều quý giá</h2><Ornament /><p>Nếu bạn có thông tin cần bổ sung hoặc chỉnh sửa, hãy liên hệ người phụ trách gia phả của gia đình. Mọi tư liệu nên được xác nhận trước khi đưa vào hồ sơ chính thức.</p><div className="contact-points"><div><ShieldCheck size={24} /><span><strong>Xác minh thông tin</strong><small>Đối chiếu tên, ngày tháng và mối quan hệ</small></span></div><div><Heart size={24} /><span><strong>Trân trọng kỷ niệm</strong><small>Lưu giữ câu chuyện và hình ảnh gia đình</small></span></div><div><Users size={24} /><span><strong>Kết nối các nhánh</strong><small>Cùng hoàn thiện cây gia phả qua nhiều thế hệ</small></span></div></div></div><div className="contact-card"><div className="contact-seal">福</div><h3>Góp sức vun bồi cội nguồn</h3><p>Thông tin liên hệ của ban quản trị có thể được cập nhật khi dòng họ chỉ định người phụ trách.</p><div className="contact-deco"><Leaf /><span>Gia hòa vạn sự hưng</span><Leaf /></div></div></section>; }

function ContentView({ kind, records, authenticated, add, edit, remove }: { kind: ContentRecord['kind']; records: ContentRecord[]; authenticated: boolean; add: () => void; edit: (record: ContentRecord) => void; remove: (record: ContentRecord) => void }) {
  const items = records.filter(record => record.kind === kind).sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt));
  const document = kind === 'document';
  return <section className="content-section container"><div className="section-toolbar"><div><span className="section-kicker">{document ? 'KHO LƯU TRỮ' : 'NHỊP SỐNG DÒNG HỌ'}</span><h2>{document ? 'Những điều đáng được nhớ' : 'Tin tức & sự kiện'}</h2><p>{document ? 'Hình ảnh, văn bản và những câu chuyện quý giá của gia đình.' : 'Lịch họp mặt, ngày giỗ và những thông báo dành cho các thế hệ.'}</p></div><button className="primary-btn" onClick={add}><Plus size={17} /> {document ? 'Thêm tư liệu' : 'Thêm sự kiện'}</button></div>{items.length ? <div className="content-grid">{items.map(item => <article className="content-card" key={item.id}><div className="content-media">{item.fileUrl && /\.(jpg|png|webp)$/i.test(item.fileUrl) ? <img src={item.fileUrl} alt={item.title} /> : document ? <BookOpen size={52} /> : <CalendarDays size={52} />}</div><div className="content-card-body"><span className="section-kicker">{document ? 'TƯ LIỆU DÒNG HỌ' : item.date ? fullDate(item.date) : 'SỰ KIỆN'}</span><h3>{item.title}</h3>{item.description && <p>{item.description}</p>}{item.location && <span className="content-location"><MapPin size={14} /> {item.location}</span>}<div className="content-actions">{item.fileUrl && <a href={item.fileUrl} target="_blank" rel="noopener noreferrer">Xem tệp <ArrowRight size={15} /></a>}{authenticated && <><button onClick={() => edit(item)}><Edit3 size={15} /> Sửa</button><button className="content-delete" onClick={() => remove(item)}><Trash2 size={15} /> Xóa</button></>}</div></div></article>)}</div> : <div className="event-empty"><span>{document ? <BookOpen size={45} /> : <CalendarDays size={45} />}</span><h3>{document ? 'Chưa có tư liệu nào' : 'Chưa có thông báo nào'}</h3><p>{document ? 'Thêm ảnh, tài liệu hoặc câu chuyện đã được gia đình xác nhận.' : 'Các cuộc họp mặt và thông báo sẽ xuất hiện tại đây.'}</p>{authenticated && <button className="text-link" onClick={add}>Bổ sung nội dung <ArrowRight size={17} /></button>}</div>}</section>;
}

function ContentForm({ initial, close, save }: { initial: ContentFormState; close: () => void; save: (form: ContentFormState, file: File | null) => Promise<void> }) {
  const [form, setForm] = useState(initial); const [file, setFile] = useState<File | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const set = <K extends keyof ContentFormState>(key: K, value: ContentFormState[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await save(form, file); } catch (err) { setError(err instanceof Error ? err.message : 'Không lưu được nội dung.'); } finally { setBusy(false); } };
  return <div className="modal-backdrop" onMouseDown={close}><form className="form-modal" role="dialog" aria-modal="true" aria-label={form.kind === 'document' ? 'Thêm tư liệu' : 'Thêm sự kiện'} onMouseDown={event => event.stopPropagation()} onSubmit={submit}><div className="form-heading"><span className="section-kicker">{form.kind === 'document' ? 'TƯ LIỆU DÒNG HỌ' : 'TIN TỨC · SỰ KIỆN'}</span><h2>{form.id ? 'Chỉnh sửa nội dung' : form.kind === 'document' ? 'Thêm tư liệu' : 'Thêm sự kiện'}</h2><p>Chỉ đăng thông tin và hình ảnh đã được gia đình đồng ý chia sẻ.</p><button type="button" className="modal-close" onClick={close} aria-label="Đóng"><X size={20} /></button></div><div className="form-content"><div className="form-grid"><label className="full">Tiêu đề <b>*</b><input required value={form.title} onChange={event => set('title', event.target.value)} placeholder={form.kind === 'document' ? 'Tên tài liệu hoặc bức ảnh' : 'Tên sự kiện'} /></label><label>Ngày {form.kind === 'document' ? 'ghi nhận' : 'diễn ra'}{form.kind === 'event' && <b>*</b>}<input type="date" required={form.kind === 'event'} value={form.date} onChange={event => set('date', event.target.value)} /></label><label>Địa điểm<input value={form.location} onChange={event => set('location', event.target.value)} placeholder="Địa điểm (nếu có)" /></label><label className="full">Mô tả<textarea rows={5} value={form.description} onChange={event => set('description', event.target.value)} placeholder="Nội dung chi tiết..." /></label><label className="full">Tệp đính kèm (JPG, PNG, WebP, PDF · tối đa 4 MB)<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={event => setFile(event.target.files?.[0] || null)} /></label>{form.fileUrl && <div className="full existing-file">Tệp hiện tại: <a href={form.fileUrl} target="_blank" rel="noopener noreferrer">Xem tệp</a></div>}</div>{error && <div className="form-error" role="alert">{error}</div>}</div><div className="form-footer"><button type="button" className="outline-btn" onClick={close}>Hủy</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu nội dung'} <ArrowRight size={16} /></button></div></form></div>;
}
