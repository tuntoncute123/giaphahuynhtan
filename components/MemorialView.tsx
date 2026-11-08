'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  BellOff,
  Calendar,
  CalendarDays,
  ChevronDown,
  Clock,
  Edit3,
  Landmark,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  X
} from 'lucide-react';
import {
  anniversaryFromSolar,
  anniversaryLabel,
  emptyAnniversary,
  memorialEvents,
  nextOccurrence,
  shiftIso,
  vietnamToday
} from '@/lib/lunar';
import { generationOf, lineageOf, byName } from '@/lib/family';
import type { FamilyData, LunarAnniversary, Member, ReminderSubscription, Shrine } from '@/lib/types';
import { AnniversaryFields } from './FamilyFields';

type ReminderForm = Omit<ReminderSubscription, 'id' | 'createdAt'>;
const blankReminder = (defaultEventKey = ''): ReminderForm => ({
  recipientId: '',
  eventKey: defaultEventKey,
  daysBefore: 1,
  enabled: true
});

type MemorialEditForm = {
  type: 'member' | 'shrine';
  sourceId: string;
  deathDate: string;
  useCustomAnniversary: boolean;
  anniversary: LunarAnniversary;
};

const blankMemorialForm = (): MemorialEditForm => ({
  type: 'member',
  sourceId: '',
  deathDate: '',
  useCustomAnniversary: true,
  anniversary: emptyAnniversary()
});

function getCountdownInfo(nextDate: string | null, today: string) {
  if (!nextDate) return { text: '', isSoon: false, isToday: false };
  const d1 = new Date(today).getTime();
  const d2 = new Date(nextDate).getTime();
  const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { text: 'Hôm nay là ngày giỗ', isSoon: true, isToday: true };
  if (diffDays === 1) return { text: 'Ngày mai', isSoon: true, isToday: false };
  if (diffDays <= 30) return { text: `Còn ${diffDays} ngày nữa`, isSoon: true, isToday: false };
  return { text: `Còn ${diffDays} ngày`, isSoon: false, isToday: false };
}

export default function MemorialView({
  data,
  authenticated,
  onData,
  onLogin,
  onToast,
  openPerson
}: {
  data: FamilyData;
  authenticated: boolean;
  onData: (data: FamilyData) => void;
  onLogin: () => void;
  onToast: (message: string) => void;
  openPerson?: (id: string) => void;
}) {
  const [editingReminder, setEditingReminder] = useState<ReminderForm | null>(null);
  const [editingMemorial, setEditingMemorial] = useState<MemorialEditForm | null>(null);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const today = vietnamToday();

  // All memorial events sorted by next occurrence
  const allEvents = useMemo(() => {
    return memorialEvents(data.members, data.shrines)
      .map(event => ({
        ...event,
        next: nextOccurrence(event.lunar, today)
      }))
      .sort((a, b) => (a.next || '9999').localeCompare(b.next || '9999'));
  }, [data.members, data.shrines, today]);

  // Filtered by search and lunar month
  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEvents.filter(event => {
      if (selectedMonth !== 'all' && event.lunar.month !== Number(selectedMonth)) {
        return false;
      }
      if (!q) return true;
      return (
        event.title.toLowerCase().includes(q) ||
        (event.location && event.location.toLowerCase().includes(q))
      );
    });
  }, [allEvents, search, selectedMonth]);

  const eligibleRecipients = useMemo(() => {
    return [...data.members].sort(byName);
  }, [data.members]);

  // Open "Thêm ngày giỗ mới"
  const handleAddNewMemorial = () => {
    if (!authenticated) {
      onLogin();
      return;
    }
    setEditingMemorial(blankMemorialForm());
    setError('');
  };

  // Open "Cập nhật ngày giỗ" for a specific card
  const handleEditMemorial = (eventKey: string) => {
    if (!authenticated) {
      onLogin();
      return;
    }
    const [kind, id] = eventKey.split(':');
    if (kind === 'person') {
      const person = data.members.find(m => m.id === id);
      if (!person) return;
      setEditingMemorial({
        type: 'member',
        sourceId: person.id,
        deathDate: person.deathDate || '',
        useCustomAnniversary: Boolean(person.anniversary),
        anniversary: person.anniversary || anniversaryFromSolar(person.deathDate) || emptyAnniversary()
      });
    } else if (kind === 'shrine') {
      const shrine = data.shrines.find(s => s.id === id);
      if (!shrine) return;
      setEditingMemorial({
        type: 'shrine',
        sourceId: shrine.id,
        deathDate: '',
        useCustomAnniversary: true,
        anniversary: shrine.ceremony || emptyAnniversary()
      });
    }
    setError('');
  };

  // Save Memorial (Member deathDate & anniversary, or Shrine ceremony)
  const saveMemorial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemorial) return;
    if (!editingMemorial.sourceId) {
      setError(editingMemorial.type === 'member' ? 'Vui lòng chọn thành viên dòng họ.' : 'Vui lòng chọn nhà thờ.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      if (editingMemorial.type === 'member') {
        const target = data.members.find(m => m.id === editingMemorial.sourceId);
        if (!target) throw new Error('Không tìm thấy thành viên.');

        const anniversary = editingMemorial.useCustomAnniversary
          ? editingMemorial.anniversary
          : anniversaryFromSolar(editingMemorial.deathDate);

        const updatedMember: Member = {
          ...target,
          deathDate: editingMemorial.deathDate,
          anniversary: anniversary || null
        };

        const res = await fetch('/api/family', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedMember)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Không lưu được ngày giỗ thành viên.');

        onData(result);
        setEditingMemorial(null);
        onToast(`Đã lưu ngày giỗ cho ${target.fullName}.`);
      } else {
        const target = data.shrines.find(s => s.id === editingMemorial.sourceId);
        if (!target) throw new Error('Không tìm thấy nhà thờ.');

        const updatedShrine: Shrine = {
          ...target,
          ceremony: editingMemorial.anniversary
        };

        const res = await fetch('/api/shrines', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedShrine)
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Không lưu được ngày giỗ nhà thờ.');

        onData(result);
        setEditingMemorial(null);
        onToast(`Đã lưu ngày giỗ tại ${target.name}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu ngày giỗ.');
    } finally {
      setBusy(false);
    }
  };

  // Open Reminder Modal
  const openAddReminder = (defaultEventKey = '') => {
    if (!authenticated) {
      onLogin();
      return;
    }
    setEditingReminder(blankReminder(defaultEventKey));
    setError('');
  };

  // Save Reminder
  const saveReminder = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingReminder) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReminder)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Không lưu được cài đặt thông báo.');
      onData(result);
      setEditingReminder(null);
      onToast('Đã cài đặt thông báo ngày giỗ.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không lưu được cài đặt thông báo.');
    } finally {
      setBusy(false);
    }
  };

  const toggleReminder = async (item: ReminderSubscription) => {
    const res = await fetch('/api/reminders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, enabled: !item.enabled })
    });
    const result = await res.json();
    if (!res.ok) {
      onToast(result.error || 'Không cập nhật được trạng thái thông báo.');
      return;
    }
    onData(result);
    onToast(item.enabled ? 'Đã tạm dừng thông báo.' : 'Đã bật thông báo ngày giỗ.');
  };

  const removeReminder = async (item: ReminderSubscription) => {
    if (!window.confirm('Xóa cài đặt thông báo này?')) return;
    const res = await fetch('/api/reminders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id })
    });
    const result = await res.json();
    if (!res.ok) {
      onToast(result.error || 'Không xóa được thông báo.');
      return;
    }
    onData(result);
    onToast('Đã xóa cài đặt thông báo ngày giỗ.');
  };

  // Candidates for memorial edit
  const memberCandidates = useMemo(() => {
    return [...data.members].sort(byName);
  }, [data.members]);

  const selectedMember = editingMemorial?.type === 'member'
    ? data.members.find(m => m.id === editingMemorial.sourceId)
    : null;

  const inferredLunarFromSolar = editingMemorial?.deathDate
    ? anniversaryFromSolar(editingMemorial.deathDate)
    : null;

  return (
    <section className="memorial-section container">
      {/* Toolbar */}
      <div className="section-toolbar memorial-main-toolbar">
        <div>
          <span className="section-kicker">TƯỞNG NHỚ TỔ TIÊN</span>
          <h2>Lịch giỗ âm lịch dòng họ</h2>
          <p>Tự động quy đổi ngày giỗ âm lịch sang dương lịch hằng năm theo múi giờ Việt Nam.</p>
        </div>
        <div className="memorial-toolbar-actions">
          <button className="primary-btn add-memorial-btn" onClick={handleAddNewMemorial}>
            <Plus size={17} /> Thêm ngày giỗ mới
          </button>
          <button className="outline-btn" onClick={() => openAddReminder()}>
            <Bell size={16} /> Cài đặt thông báo ngày giỗ
          </button>
        </div>
      </div>

      {/* Guide notice */}
      <div className="memorial-intro">
        <CalendarDays size={26} />
        <div>
          <p>
            <strong>Ghi nhận ngày giỗ:</strong> Bạn có thể nhập ngày mất dương lịch (hệ thống tự tính ngày âm)
            hoặc nhập trực tiếp ngày giỗ âm lịch riêng của gia đình. Bấm vào nút <strong>“Sửa ngày giỗ”</strong> trên từng thẻ để cập nhật.
          </p>
        </div>
      </div>

      {/* Filters: Search & Lunar Month */}
      <div className="memorial-filters-bar">
        <div className="memorial-search-box">
          <Search size={17} />
          <input
            aria-label="Tìm kiếm ngày giỗ"
            placeholder="Tìm theo tên cụ, thành viên, địa điểm cúng giỗ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="clear-search" onClick={() => setSearch('')}>
              <X size={15} />
            </button>
          )}
        </div>

        <div className="memorial-month-select-wrap">
          <label>
            <span>Tháng âm:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              aria-label="Lọc theo tháng âm lịch"
            >
              <option value="all">Tất cả 12 tháng</option>
              <option value="1">Tháng 1 (Giêng)</option>
              <option value="2">Tháng 2</option>
              <option value="3">Tháng 3</option>
              <option value="4">Tháng 4</option>
              <option value="5">Tháng 5</option>
              <option value="6">Tháng 6</option>
              <option value="7">Tháng 7</option>
              <option value="8">Tháng 8</option>
              <option value="9">Tháng 9</option>
              <option value="10">Tháng 10</option>
              <option value="11">Tháng 11</option>
              <option value="12">Tháng 12 (Chạp)</option>
            </select>
            <ChevronDown size={15} />
          </label>
        </div>
      </div>

      {/* Result Count */}
      <div className="memorial-count-line">
        Hiển thị <strong>{filteredEvents.length}</strong> / {allEvents.length} ngày giỗ trong năm
        {selectedMonth !== 'all' && ` thuộc tháng ${selectedMonth} âm lịch`}
      </div>

      {/* Memorial Grid */}
      {filteredEvents.length ? (
        <div className="memorial-grid">
          {filteredEvents.map(event => {
            const isPerson = event.kind === 'person';
            const person = isPerson ? data.members.find(m => m.id === event.sourceId) : null;
            const shrine = !isPerson ? data.shrines.find(s => s.id === event.sourceId) : null;
            const countdown = getCountdownInfo(event.next, today);

            return (
              <article className="memorial-card" key={event.key}>
                <div className="memorial-card-main">
                  <div className={`memorial-icon ${isPerson ? 'icon-person' : 'icon-shrine'}`}>
                    {isPerson ? '✦' : '祠'}
                  </div>

                  <div className="memorial-card-info">
                    <div className="memorial-card-top-tags">
                      <span className="section-kicker">
                        {isPerson ? 'GIỖ THÀNH VIÊN' : 'LỄ TẠI NHÀ THỜ'}
                      </span>
                      {person && (
                        <span className="memorial-gen-tag">
                          Đời {generationOf(person.id, data.members)}
                        </span>
                      )}
                    </div>

                    <h3 className="memorial-card-title">{event.title}</h3>

                    {person && (
                      <p className="memorial-lineage-text">
                        {lineageOf(person, data.members)}
                      </p>
                    )}

                    <div className="memorial-lunar-highlight">
                      <Calendar size={14} />
                      <strong>{anniversaryLabel(event.lunar)}</strong>
                    </div>

                    {event.location && (
                      <small className="memorial-location-text">
                        📍 {event.location}
                      </small>
                    )}
                  </div>

                  <div className="memorial-date">
                    <strong>
                      {event.next ? event.next.split('-').reverse().join('/') : '—'}
                    </strong>
                    <span>Dương lịch kỳ tới</span>
                    {countdown.text && (
                      <span
                        className={`memorial-countdown-tag ${
                          countdown.isToday ? 'is-today' : countdown.isSoon ? 'is-soon' : ''
                        }`}
                      >
                        <Clock size={11} /> {countdown.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card action buttons */}
                <div className="memorial-card-actions">
                  <button
                    type="button"
                    className="card-action-btn edit"
                    onClick={() => handleEditMemorial(event.key)}
                    title="Cập nhật ngày giỗ này"
                  >
                    <Edit3 size={14} /> <span>Cập nhật ngày giỗ</span>
                  </button>

                  {isPerson && openPerson && (
                    <button
                      type="button"
                      className="card-action-btn view"
                      onClick={() => openPerson(event.sourceId)}
                      title="Xem hồ sơ thành viên"
                    >
                      <User size={14} /> <span>Xem hồ sơ</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="card-action-btn bell"
                    onClick={() => openAddReminder(event.key)}
                    title="Cài đặt nhận thông báo ngày giỗ"
                  >
                    <Bell size={14} /> <span>Nhận thông báo</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="event-empty">
          <CalendarDays size={45} />
          <h3>Chưa tìm thấy ngày giỗ phù hợp</h3>
          <p>
            {search || selectedMonth !== 'all'
              ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn tất cả các tháng.'
              : 'Chưa có thông tin ngày giỗ nào. Hãy bấm “Thêm ngày giỗ mới” để bắt đầu ghi nhận.'}
          </p>
          <button className="primary-btn" onClick={handleAddNewMemorial}>
            <Plus size={16} /> Thêm ngày giỗ mới
          </button>
        </div>
      )}

      {/* Reminder Subscriptions Panel */}
      <div className="reminder-panel">
        <div className="section-toolbar">
          <div>
            <span className="section-kicker">THÔNG BÁO TỰ ĐỘNG</span>
            <h2>Người nhận thông báo ngày giỗ</h2>
            <p>Cài đặt nhận thông báo nhắc nhở trước ngày giỗ qua ứng dụng và thông báo Web Push.</p>
          </div>
          <button className="outline-btn" onClick={() => openAddReminder()}>
            <Plus size={15} /> Thêm người nhận thông báo
          </button>
        </div>

        {authenticated ? (
          <>
            <div className="integration-status ready">
              <Bell size={20} />
              <div>
                <strong>Hệ thống thông báo ngày giỗ tự động (App & Web Push)</strong>
                <span>
                  Thông báo tự động sẽ được gửi trước ngày giỗ đến các thành viên đã cài đặt.
                </span>
              </div>
            </div>

            {data.reminders.length ? (
              <div className="reminder-list">
                {data.reminders.map(item => {
                  const recipient = data.members.find(m => m.id === item.recipientId);
                  const memorial = allEvents.find(e => e.key === item.eventKey);
                  const next = memorial?.next;
                  const log = [...data.reminderLogs].reverse().find(entry => entry.subscriptionId === item.id);

                  return (
                    <div className="reminder-row" key={item.id}>
                      <div className="reminder-row-main">
                        <strong>{recipient?.fullName || 'Thành viên đã xóa'}</strong>
                        <span>
                          {memorial?.title || 'Ngày giỗ đã xóa'} ·{' '}
                          {item.daysBefore === 0 ? 'Đúng ngày' : `Trước ${item.daysBefore} ngày`}
                        </span>
                        <small>
                          {next
                            ? `Lần thông báo tới: ${shiftIso(next, -item.daysBefore).split('-').reverse().join('/')}`
                            : 'Chưa có lịch tới'}
                          {log
                            ? ` · Gần nhất: ${log.status === 'sent' ? 'đã gửi' : log.status === 'failed' ? 'gửi lỗi' : 'đang gửi'}`
                            : ''}
                        </small>
                      </div>
                      <div className="reminder-row-actions">
                        <button className="outline-btn" onClick={() => toggleReminder(item)}>
                          {item.enabled ? <Bell size={15} /> : <BellOff size={15} />}
                          {item.enabled ? 'Đang bật' : 'Tạm dừng'}
                        </button>
                        <button
                          className="icon-btn"
                          onClick={() => removeReminder(item)}
                          aria-label="Xóa cài đặt thông báo"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="reminder-empty">
                Chưa có ai đăng ký nhận thông báo ngày giỗ. Bấm “Thêm người nhận thông báo” để bắt đầu cài đặt.
              </div>
            )}
          </>
        ) : (
          <div className="reminder-empty">
            Đăng nhập quản trị để cài đặt và theo dõi danh sách người nhận thông báo ngày giỗ.
          </div>
        )}
      </div>

      {/* Modal: Thêm hoặc Cập nhật ngày giỗ */}
      {editingMemorial && (
        <div className="modal-backdrop" onMouseDown={() => setEditingMemorial(null)}>
          <form
            className="form-modal memorial-edit-form"
            role="dialog"
            aria-modal="true"
            aria-label="Cập nhật thông tin ngày giỗ"
            onMouseDown={e => e.stopPropagation()}
            onSubmit={saveMemorial}
          >
            <div className="form-heading">
              <span className="section-kicker">KỶ NIỆM TỔ TIÊN</span>
              <h2>{editingMemorial.sourceId ? 'Cập nhật ngày giỗ' : 'Thêm ngày giỗ mới'}</h2>
              <p>Lưu ngày mất hoặc ngày giỗ âm lịch để lập lịch giỗ và nhắc nhở con cháu.</p>
              <button
                type="button"
                className="modal-close"
                onClick={() => setEditingMemorial(null)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-content">
              <div className="form-grid">
                {/* Chọn đối tượng: Thành viên hoặc Nhà thờ */}
                {!editingMemorial.sourceId && (
                  <div className="full">
                    <label className="field-group-title">Đối tượng ngày giỗ</label>
                    <div className="memorial-type-tabs">
                      <button
                        type="button"
                        className={`type-tab-btn ${editingMemorial.type === 'member' ? 'active' : ''}`}
                        onClick={() => setEditingMemorial({ ...editingMemorial, type: 'member', sourceId: '' })}
                      >
                        <User size={15} /> Thành viên dòng họ
                      </button>
                      <button
                        type="button"
                        className={`type-tab-btn ${editingMemorial.type === 'shrine' ? 'active' : ''}`}
                        onClick={() => setEditingMemorial({ ...editingMemorial, type: 'shrine', sourceId: '' })}
                      >
                        <Landmark size={15} /> Nhà thờ dòng họ
                      </button>
                    </div>
                  </div>
                )}

                {/* Chọn thành viên */}
                {editingMemorial.type === 'member' && (
                  <label className="full">
                    Thành viên dòng họ <b>*</b>
                    <select
                      required
                      value={editingMemorial.sourceId}
                      onChange={e => {
                        const mId = e.target.value;
                        const m = data.members.find(item => item.id === mId);
                        setEditingMemorial({
                          ...editingMemorial,
                          sourceId: mId,
                          deathDate: m?.deathDate || editingMemorial.deathDate,
                          useCustomAnniversary: Boolean(m?.anniversary) || editingMemorial.useCustomAnniversary,
                          anniversary: m?.anniversary || anniversaryFromSolar(m?.deathDate || '') || editingMemorial.anniversary
                        });
                      }}
                    >
                      <option value="">-- Chọn thành viên --</option>
                      {memberCandidates.map(m => {
                        const gen = generationOf(m.id, data.members);
                        const lineage = lineageOf(m, data.members);
                        return (
                          <option value={m.id} key={m.id}>
                            {m.fullName} (Đời {gen}) · {lineage}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}

                {/* Chọn nhà thờ */}
                {editingMemorial.type === 'shrine' && (
                  <label className="full">
                    Nhà thờ dòng họ <b>*</b>
                    <select
                      required
                      value={editingMemorial.sourceId}
                      onChange={e => setEditingMemorial({ ...editingMemorial, sourceId: e.target.value })}
                    >
                      <option value="">-- Chọn nhà thờ --</option>
                      {data.shrines.map(s => (
                        <option value={s.id} key={s.id}>
                          {s.name} {s.location.address ? `(${s.location.address})` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {/* Ngày mất dương lịch (cho thành viên) */}
                {editingMemorial.type === 'member' && (
                  <label className="full">
                    Ngày mất dương lịch (nếu nhớ)
                    <input
                      type="date"
                      value={editingMemorial.deathDate}
                      onChange={e => setEditingMemorial({ ...editingMemorial, deathDate: e.target.value })}
                    />
                    <small>Nếu nhập ngày mất dương lịch, hệ thống sẽ tự động đối chiếu sang âm lịch.</small>
                  </label>
                )}

                {inferredLunarFromSolar && (
                  <div className="full inferred-anniversary-box">
                    <Sparkles size={16} />
                    <span>
                      Quy đổi theo ngày mất: <strong>{anniversaryLabel(inferredLunarFromSolar)}</strong>
                    </span>
                  </div>
                )}

                {/* Tùy chỉnh ngày giỗ âm lịch riêng */}
                <div className="full">
                  <div className="form-divider">
                    <span>Ngày giỗ âm lịch</span>
                  </div>

                  <label className="checkbox-line" style={{ marginBottom: '10px' }}>
                    <input
                      type="checkbox"
                      checked={editingMemorial.useCustomAnniversary}
                      onChange={e => setEditingMemorial({ ...editingMemorial, useCustomAnniversary: e.target.checked })}
                    />
                    <strong>Nhập ngày giỗ âm lịch cụ thể</strong>
                  </label>

                  {editingMemorial.useCustomAnniversary && (
                    <div className="anniversary-fields-sub">
                      <div className="form-grid">
                        <label>
                          Ngày âm (1 - 30) <b>*</b>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            required
                            value={editingMemorial.anniversary.day}
                            onChange={e =>
                              setEditingMemorial({
                                ...editingMemorial,
                                anniversary: { ...editingMemorial.anniversary, day: Number(e.target.value) }
                              })
                            }
                          />
                        </label>
                        <label>
                          Tháng âm (1 - 12) <b>*</b>
                          <input
                            type="number"
                            min={1}
                            max={12}
                            required
                            value={editingMemorial.anniversary.month}
                            onChange={e =>
                              setEditingMemorial({
                                ...editingMemorial,
                                anniversary: { ...editingMemorial.anniversary, month: Number(e.target.value) }
                              })
                            }
                          />
                        </label>

                        <label className="checkbox-line full">
                          <input
                            type="checkbox"
                            checked={editingMemorial.anniversary.leap}
                            onChange={e =>
                              setEditingMemorial({
                                ...editingMemorial,
                                anniversary: { ...editingMemorial.anniversary, leap: e.target.checked }
                              })
                            }
                          />
                          Ngày giỗ thuộc tháng nhuận
                        </label>

                        <label className="full">
                          Khi tháng âm thiếu ngày 30
                          <select
                            value={editingMemorial.anniversary.missingDay}
                            onChange={e =>
                              setEditingMemorial({
                                ...editingMemorial,
                                anniversary: {
                                  ...editingMemorial.anniversary,
                                  missingDay: e.target.value as LunarAnniversary['missingDay']
                                }
                              })
                            }
                          >
                            <option value="last">Chuyển sang ngày cuối tháng (29)</option>
                            <option value="skip">Không tính ngày giỗ năm đó</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && <div className="form-error" role="alert">{error}</div>}
            </div>

            <div className="form-footer">
              <button
                type="button"
                className="outline-btn"
                onClick={() => setEditingMemorial(null)}
                disabled={busy}
              >
                Hủy
              </button>
              <button type="submit" className="primary-btn" disabled={busy}>
                {busy ? 'Đang lưu...' : 'Lưu ngày giỗ'} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Cài đặt thông báo ngày giỗ */}
      {editingReminder && (
        <div className="modal-backdrop" onMouseDown={() => setEditingReminder(null)}>
          <form
            className="form-modal reminder-form"
            role="dialog"
            aria-modal="true"
            aria-label="Cài đặt thông báo ngày giỗ"
            onMouseDown={event => event.stopPropagation()}
            onSubmit={saveReminder}
          >
            <div className="form-heading">
              <span className="section-kicker">THÔNG BÁO NGÀY GIỖ</span>
              <h2>Cài đặt thông báo ngày giỗ</h2>
              <p>Chọn thành viên và ngày giỗ gia đình cần theo dõi để nhận thông báo trước ngày lễ.</p>
              <button
                className="modal-close"
                type="button"
                onClick={() => setEditingReminder(null)}
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-content">
              <div className="form-grid">
                <label className="full">
                  Người nhận thông báo <b>*</b>
                  <select
                    required
                    value={editingReminder.recipientId}
                    onChange={event => setEditingReminder({ ...editingReminder, recipientId: event.target.value })}
                  >
                    <option value="">-- Chọn thành viên nhận thông báo --</option>
                    {eligibleRecipients.map(member => (
                      <option value={member.id} key={member.id}>
                        {member.fullName} (Đời {generationOf(member.id, data.members)}){member.zaloPhone ? ` · ${member.zaloPhone}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full">
                  Ngày giỗ theo dõi <b>*</b>
                  <select
                    required
                    value={editingReminder.eventKey}
                    onChange={event => setEditingReminder({ ...editingReminder, eventKey: event.target.value })}
                  >
                    <option value="">-- Chọn ngày giỗ --</option>
                    {allEvents.map(event => (
                      <option value={event.key} key={event.key}>
                        {event.title} · {anniversaryLabel(event.lunar)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="full">
                  Nhắc trước bao nhiêu ngày?
                  <input
                    type="number"
                    min={0}
                    max={30}
                    required
                    value={editingReminder.daysBefore}
                    onChange={event => setEditingReminder({ ...editingReminder, daysBefore: Number(event.target.value) })}
                  />
                  <small>Nhập 0 để nhận thông báo đúng ngày giỗ; nhập 1 - 3 ngày để chuẩn bị mâm cỗ trước.</small>
                </label>
              </div>

              {!eligibleRecipients.length && (
                <p className="field-help">
                  Chưa có thành viên nào trong danh sách gia phả.
                </p>
              )}
              {error && <div className="form-error" role="alert">{error}</div>}
            </div>

            <div className="form-footer">
              <button
                className="outline-btn"
                type="button"
                onClick={() => setEditingReminder(null)}
                disabled={busy}
              >
                Hủy
              </button>
              <button
                className="primary-btn"
                type="submit"
                disabled={busy || !eligibleRecipients.length || !allEvents.length}
              >
                {busy ? 'Đang lưu...' : 'Lưu cài đặt thông báo'} <ArrowRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
