'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BellRing, BookOpen, CalendarDays, ChevronDown, ChevronRight, Download, Edit3, Heart, Landmark, Leaf, MapPin, Menu, Minus, Move, Plus, Search, ShieldCheck, Sprout, Trash2, TreePine, UserRound, Users, X } from 'lucide-react';
import type { ContentRecord, FamilyData, Member } from '@/lib/types';
import { byName, childrenOf, descendantsOf, displayYear, fullDate, generationOf, matchesMember } from '@/lib/family';
import { addressFor } from '@/lib/kinship';
import ShrinesView from './ShrinesView';
import MemorialView from './MemorialView';
import MemberEditor from './MemberEditor';
import MemberProfile from './MemberProfile';

type View = 'home' | 'tree' | 'members' | 'shrines' | 'memorial' | 'documents' | 'news' | 'contact';
type FormState = Omit<Member, 'id' | 'createdAt'> & { id?: string };
type ContentFormState = Omit<ContentRecord, 'id' | 'createdAt'> & { id?: string };
const emptyForm: FormState = { fullName: '', aliases: [], birthOrder: null, gender: 'Nam', birthDate: '', deathDate: '', anniversary: null, birthPlace: '', currentPlace: '', home: { address: '', latitude: null, longitude: null }, homePublic: false, zaloPhone: '', zaloConsent: false, occupation: '', biography: '', fatherId: null, motherId: null, spouseIds: [], avatar: '' };
const nav: { id: View; label: string }[] = [
  { id: 'home', label: 'Trang chủ' }, { id: 'tree', label: 'Gia phả' }, { id: 'members', label: 'Thành viên' },
  { id: 'shrines', label: 'Nhà thờ' }, { id: 'memorial', label: 'Ngày giỗ' }, { id: 'contact', label: 'Liên hệ' }
];
const pageTitle: Record<View, string> = { home: 'Trang chủ', tree: 'Cây gia phả', members: 'Thành viên dòng họ', shrines: 'Nhà thờ dòng họ', memorial: 'Ngày giỗ âm lịch', documents: 'Tư liệu dòng họ', news: 'Tin tức & sự kiện', contact: 'Liên hệ' };

function initials(name: string) { return name.split(' ').slice(-2).map(x => x[0]).join('').toUpperCase(); }
function Avatar({ person, size = 'normal' }: { person: Member; size?: 'normal' | 'large' | 'small' }) {
  return <div className={`avatar avatar-${size} ${person.gender === 'Nữ' ? 'avatar-female' : ''}`}>{person.avatar ? <img src={person.avatar} alt="" /> : initials(person.fullName)}</div>;
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
            { icon: <Leaf />, name: 'LIÊN HỆ', text: 'Góp ý, liên hệ với ban quản trị', target: 'contact' as View }
          ].map(x => <button className="quick-item" key={x.name} onClick={() => go(x.target)}><span className="quick-icon">{x.icon}</span><strong>{x.name}</strong><span>{x.text}</span></button>)}
        </div>
      </section>
      <section className="intro-section container">
        <div className="intro-art"><div className="round-art"><TreePine size={92} strokeWidth={1.2} /><span>Phúc đức lưu truyền</span></div><span className="flower flower-one">✿</span><span className="flower flower-two">✿</span></div>
        <div className="intro-copy"><span className="section-kicker">CỘI NGUỒN VÀ KẾT NỐI</span><h2>Mỗi nhánh cây là một câu chuyện</h2><Ornament /><p>Gia phả giúp chúng ta biết mình đến từ đâu, hiểu mối dây gắn bó giữa các thế hệ và gìn giữ những câu chuyện quý giá cho mai sau.</p><p>Hãy bắt đầu từ một cái tên, khám phá những người thân trong dòng họ và cùng bổ sung thông tin để cây gia đình ngày càng trọn vẹn.</p><button className="text-link" onClick={() => go('members')}>Gặp gỡ các thành viên <ArrowRight size={18} /></button></div>
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
      {!loading && !serverError && data && view === 'memorial' && <MemorialView data={data} authenticated={authenticated} onData={setData} onLogin={() => setLoginOpen(true)} onToast={setToast} />}
      {view === 'documents' && <ContentView kind="document" records={data?.content || []} authenticated={authenticated} add={() => authenticated ? setContentEditing({ kind: 'document', title: '', description: '', date: '', location: '', fileUrl: '' }) : setLoginOpen(true)} edit={record => setContentEditing({ ...record })} remove={removeContent} />}
      {view === 'news' && <ContentView kind="event" records={data?.content || []} authenticated={authenticated} add={() => authenticated ? setContentEditing({ kind: 'event', title: '', description: '', date: '', location: '', fileUrl: '' }) : setLoginOpen(true)} edit={record => setContentEditing({ ...record })} remove={removeContent} />}
      {view === 'contact' && <ContactView />}
    </main>

    <footer className="footer"><div className="container footer-grid"><div><div className="footer-brand"><span className="brand-seal">Tổ</span><strong>Gia phả Huỳnh Tấn</strong></div><p>Gìn giữ cội nguồn, kết nối hôm nay<br />và trao truyền cho mai sau.</p></div><div><h3>Khám phá</h3><button onClick={() => go('tree')}>Cây gia phả</button><button onClick={() => go('members')}>Thành viên</button><button onClick={() => go('shrines')}>Nhà thờ</button><button onClick={() => go('memorial')}>Ngày giỗ</button></div><div><h3>Kết nối</h3><button onClick={() => go('documents')}>Tư liệu</button><button onClick={() => go('news')}>Tin tức · Sự kiện</button><button onClick={() => go('contact')}>Liên hệ</button></div><div className="footer-mark">福</div></div><div className="container footer-bottom">© {new Date().getFullYear()} Gia phả Huỳnh Tấn · Gìn giữ truyền thống gia đình</div></footer>
    {selected && <MemberProfile person={selected} members={members} authenticated={authenticated} close={() => setSelectedId(null)} openPerson={openPerson} edit={() => { setSelectedId(null); setEditing({ ...selected }); }} remove={() => remove(selected)} goTree={() => { const id = selected.id; setSelectedId(null); setFocusTreeId(id); go('tree'); }} />}
    {editing && <MemberEditor initial={editing} members={members} close={() => setEditing(null)} save={save} />}
    {contentEditing && <ContentForm initial={contentEditing} close={() => setContentEditing(null)} save={saveContent} />}
    {loginOpen && <LoginModal close={() => setLoginOpen(false)} success={() => { setAuthenticated(true); setLoginOpen(false); setToast('Đã đăng nhập quản trị.'); }} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </>;
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

  // Autocomplete matching members by name
  const matchingMembers = useMemo(() => {
    if (!filterName.trim()) return [];
    return members.filter(m => matchesMember(m, filterName)).slice(0, 12);
  }, [filterName, members]);

  const roots = members.filter(m => !m.fatherId && !m.motherId && !m.spouseIds.some(s => {
    const spouse = members.find(x => x.id === s);
    return spouse && (spouse.fatherId || spouse.motherId || spouse.gender === 'Nam' && m.gender !== 'Nam');
  })).sort(byName);
  const options = roots.length ? roots : members.filter(m => !m.fatherId && !m.motherId);

  // If focusTreeId is active, show only that person and their descendants downwards
  const focusPerson = focusTreeId ? members.find(m => m.id === focusTreeId) : null;
  const shown = focusPerson
    ? [focusPerson]
    : rootId === 'all'
    ? options
    : options.filter(m => m.id === rootId);

  const totalGen = members.length ? Math.max(...members.map(m => generationOf(m.id, members))) : 1;
  const address = fromId && toId ? addressFor(fromId, toId, members) : null;

  const renderNode = (person: Member, visited: Set<string>): React.ReactNode => {
    if (visited.has(person.id) || generationOf(person.id, members) > maxGen) return null;
    const next = new Set(visited).add(person.id);
    const spouse = person.spouseIds.map(id => members.find(m => m.id === id)).filter((x): x is Member => !!x);
    const children = members.filter(m => m.fatherId === person.id || (!m.fatherId && m.motherId === person.id) || spouse.some(s => !m.fatherId && m.motherId === s.id)).sort(byName);
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
              <span className="spouse-heart"><Heart size={12} fill="currentColor" /> Phối ngẫu</span>
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
        <div className="relationship-heading">
          <Heart size={20} />
          <div>
            <strong>Nên gọi bằng vai vế gì?</strong>
            <span>Chọn bản thân và người muốn xưng hô để tra cứu cách gọi chính xác theo dòng họ.</span>
          </div>
        </div>
        <div className="relationship-fields">
          <select aria-label="Tôi là" value={fromId} onChange={e => setFromId(e.target.value)}>
            <option value="">Tôi là...</option>
            {[...members].sort(byName).map(m => (
              <option value={m.id} key={m.id}>{m.fullName} (Đời {generationOf(m.id, members)})</option>
            ))}
          </select>
          <ArrowRight size={18} />
          <select aria-label="Tôi muốn gọi" value={toId} onChange={e => setToId(e.target.value)}>
            <option value="">Tôi muốn gọi...</option>
            {[...members].sort(byName).map(m => (
              <option value={m.id} key={m.id}>{m.fullName} (Đời {generationOf(m.id, members)})</option>
            ))}
          </select>
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

      <div className="tree-panel">
        <div className="tree-controls">
          <div className="tree-filters">
            {/* Lọc xem cây từ một người cụ thể đổ xuống */}
            <div className="tree-name-filter">
              <label>Lọc từ người:
                <div className="tree-search-input-wrap">
                  <Search size={15} />
                  <input
                    type="text"
                    value={filterName}
                    placeholder="Tìm tên để xem nhánh..."
                    onChange={e => {
                      setFilterName(e.target.value);
                      setDropdownOpen(true);
                    }}
                    onFocus={() => setDropdownOpen(true)}
                  />
                  {(filterName || focusTreeId) && (
                    <button
                      type="button"
                      className="clear-filter-icon"
                      title="Xóa bộ lọc"
                      onClick={() => {
                        setFilterName('');
                        onFocusTreeId(null);
                        setDropdownOpen(false);
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
                          onClick={() => {
                            onFocusTreeId(m.id);
                            setFilterName(m.fullName);
                            setDropdownOpen(false);
                          }}
                        >
                          <Avatar person={m} size="small" />
                          <div>
                            <strong>{m.fullName}</strong>
                            <small>Đời thứ {generationOf(m.id, members)} · {childrenOf(m.id, members).length} con trực hệ</small>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </label>
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

          <div className="zoom-controls">
            <button aria-label="Thu nhỏ" title="Thu nhỏ (tối thiểu 10%)" onClick={zoomOut}><Minus size={17} /></button>
            <span title="Tỉ lệ hiện tại">{Math.round(zoom * 100)}%</span>
            <button aria-label="Phóng to" title="Phóng to (tối đa 200%)" onClick={zoomIn}><Plus size={17} /></button>
            <button title="Thu nhỏ toàn cảnh (20%)" onClick={zoomOverview}>20%</button>
            <button title="Đặt lại kích thước chuẩn (100%)" onClick={zoomReset}>100%</button>
          </div>
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
              }}
            >
              <X size={15} /> Xem lại toàn bộ cây
            </button>
          </div>
        )}

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
        </div>

        <div className="tree-legend">
          <span><i className="legend-dot" /> Thành viên dòng họ</span>
          <span><Heart size={14} /> Phối ngẫu</span>
          <span><Move size={14} /> <strong>Giữ chuột và kéo</strong> để di chuyển trên cây</span>
          <span>Giữ <strong>Ctrl + cuộn chuột</strong> để thu phóng</span>
        </div>
      </div>

      <div className="tree-hint">
        <Sprout size={25} />
        <div>
          <strong>Góp một nhánh, giữ trọn cội nguồn</strong>
          <p>Thêm thông tin cha, mẹ hoặc người phối ngẫu khi tạo hồ sơ để thành viên xuất hiện đúng vị trí trong cây.</p>
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
  const filtered = members.filter(m => matchesMember(m, search) && (generation === 'all' || generationOf(m.id, members) === Number(generation)) && (gender === 'all' || m.gender === gender)).sort((a,b) => generationOf(a.id,members) - generationOf(b.id,members) || byName(a,b));
  return <section className="members-section container"><div className="section-toolbar"><div><span className="section-kicker">DANH SÁCH DÒNG HỌ</span><h2>Gương mặt qua các thế hệ</h2><p>Tìm kiếm, xem quan hệ và cập nhật thông tin thành viên.</p></div><div className="toolbar-actions"><button className="outline-btn" onClick={exportData}><Download size={17} /> Xuất dữ liệu</button><button className="primary-btn" onClick={addMember}><Plus size={17} /> Thêm thành viên</button></div></div><div className="directory-filters"><div className="search-box"><Search size={19} /><input aria-label="Tìm thành viên" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, biệt danh, ví dụ: cô Bảy..." /></div><div className="select-wrap"><select aria-label="Lọc theo đời" value={generation} onChange={e => setGeneration(e.target.value)}><option value="all">Tất cả đời</option>{Array.from({ length: gens }, (_, i) => i+1).map(n => <option key={n} value={n}>Đời thứ {n}</option>)}</select><ChevronDown size={16} /></div><div className="select-wrap"><select aria-label="Lọc theo giới tính" value={gender} onChange={e => setGender(e.target.value)}><option value="all">Tất cả</option><option>Nam</option><option>Nữ</option><option>Khác</option></select><ChevronDown size={16} /></div></div><div className="result-count">Hiển thị <strong>{filtered.length}</strong> / {members.length} thành viên</div><div className="member-grid">{filtered.map(m => <button className="member-card" key={m.id} onClick={() => openPerson(m.id)}><div className="member-card-top"><Avatar person={m} /><span className="pill">Đời thứ {generationOf(m.id, members)}</span></div><h3>{m.fullName}</h3>{m.aliases.length > 0 && <div className="member-aliases">{m.aliases.slice(0, 2).join(" · ")}</div>}<p>{displayYear(m.birthDate)} {m.deathDate ? `– ${displayYear(m.deathDate)}` : '– nay'}</p><div className="member-card-meta"><span><MapPin size={14} /> {m.birthPlace || 'Chưa cập nhật quê quán'}</span><span><Users size={14} /> {childrenOf(m.id,members).length} người con</span></div><span className="card-link">Xem hồ sơ <ArrowRight size={16} /></span></button>)}</div>{!filtered.length && <div className="empty-state">Không tìm thấy thành viên phù hợp. Hãy thử bộ lọc khác.</div>}<p className="demo-note">Các hồ sơ ban đầu chỉ là dữ liệu minh họa, không đại diện cho người thật.</p></section>;
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
