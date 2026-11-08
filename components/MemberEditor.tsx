'use client';
import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import type { Member } from '@/lib/types';
import { anniversaryFromSolar, anniversaryLabel } from '@/lib/lunar';
import { byName } from '@/lib/family';
import { AnniversaryFields, LocationFields } from './FamilyFields';

type FormState = Omit<Member, 'id' | 'createdAt'> & { id?: string };
export default function MemberEditor({ initial, members, close, save }: { initial: FormState; members: Member[]; close: () => void; save: (form: FormState, avatarFile: File | null) => Promise<void> }) {
  const [form, setForm] = useState(initial); const [aliasesText, setAliasesText] = useState(initial.aliases.join(', ')); const [avatarFile, setAvatarFile] = useState<File | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm(previous => ({ ...previous, [key]: value }));
  const candidates = members.filter(m => m.id !== form.id).sort(byName);
  const inferred = anniversaryFromSolar(form.deathDate);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await save({ ...form, aliases: aliasesText.split(',').map(value => value.trim()).filter(Boolean) }, avatarFile); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu hồ sơ.'); } finally { setBusy(false); } };
  return <div className="modal-backdrop" onMouseDown={close}><form className="form-modal member-editor" role="dialog" aria-modal="true" aria-label={form.id ? 'Chỉnh sửa thành viên' : 'Thêm thành viên'} onMouseDown={event => event.stopPropagation()} onSubmit={submit}>
    <div className="form-heading"><div><span className="section-kicker">HỒ SƠ GIA PHẢ</span><h2>{form.id ? 'Chỉnh sửa thành viên' : 'Thêm thành viên mới'}</h2><p>Biệt danh, nhà ở và ngày giỗ giúp gia đình tìm đúng người, đúng nơi.</p></div><button type="button" className="modal-close" onClick={close} aria-label="Đóng"><X size={20} /></button></div>
    <div className="form-content"><div className="form-grid">
      <label className="full">Họ và tên <b>*</b><input required value={form.fullName} onChange={event => set('fullName', event.target.value)} placeholder="Ví dụ: Huỳnh Thị Lan" /></label>
      <label className="full">Biệt danh / tên thường gọi<input value={aliasesText} onChange={event => setAliasesText(event.target.value)} placeholder="Ví dụ: Cô Bảy, Bảy Lan" /><small>Ngăn cách nhiều biệt danh bằng dấu phẩy. Có thể tìm kiếm theo các tên này.</small></label>
      <label>Thứ tự trong nhà<input type="number" min={1} max={30} value={form.birthOrder ?? ''} onChange={event => set('birthOrder', event.target.value ? Number(event.target.value) : null)} placeholder="Ví dụ: 7" /></label>
      <label>Giới tính<select value={form.gender} onChange={event => set('gender', event.target.value as Member['gender'])}><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
      <label>Ngày sinh dương lịch<input type="date" value={form.birthDate} onChange={event => set('birthDate', event.target.value)} /></label>
      <label>Ngày mất dương lịch<input type="date" value={form.deathDate} onChange={event => set('deathDate', event.target.value)} /></label>
      <label>Quê quán<input value={form.birthPlace} onChange={event => set('birthPlace', event.target.value)} placeholder="Tỉnh / thành phố" /></label>
      <label>Nơi ở hiện tại<input value={form.currentPlace} onChange={event => set('currentPlace', event.target.value)} placeholder="Tỉnh / thành phố" /></label>
      <label className="full">Nghề nghiệp<input value={form.occupation} onChange={event => set('occupation', event.target.value)} /></label>
    </div>
    <div className="form-divider"><span>Ngày giỗ âm lịch</span></div>
    {inferred && <p className="field-help">Theo ngày mất đã nhập: <strong>{anniversaryLabel(inferred)}</strong>. Nếu gia đình có lệ giỗ khác, bật mục dưới để nhập thủ công.</p>}
    <AnniversaryFields value={form.anniversary} onChange={anniversary => set('anniversary', anniversary)} title="Dùng ngày giỗ âm lịch riêng" />
    <div className="form-divider"><span>Quan hệ gia đình</span></div><div className="form-grid">
      <label>Cha<select value={form.fatherId || ''} onChange={event => set('fatherId', event.target.value || null)}><option value="">Chưa chọn</option>{candidates.filter(m => m.gender === 'Nam').map(m => <option value={m.id} key={m.id}>{m.fullName}</option>)}</select></label>
      <label>Mẹ<select value={form.motherId || ''} onChange={event => set('motherId', event.target.value || null)}><option value="">Chưa chọn</option>{candidates.filter(m => m.gender === 'Nữ').map(m => <option value={m.id} key={m.id}>{m.fullName}</option>)}</select></label>
      <label className="full">{form.gender === 'Nam' ? 'Vợ' : form.gender === 'Nữ' ? 'Chồng' : 'Vợ / Chồng'}<select value={form.spouseIds[0] || ''} onChange={event => set('spouseIds', event.target.value ? [event.target.value] : [])}><option value="">Chưa chọn</option>{candidates.map(m => <option value={m.id} key={m.id}>{m.fullName}</option>)}</select></label>
    </div>
    <div className="form-divider"><span>Vị trí nhà ở</span></div><LocationFields value={form.home} onChange={home => set('home', home)} title="Địa chỉ nhà / nơi gia đình đang ở" />
    <label className="checkbox-line standalone"><input type="checkbox" checked={form.homePublic} onChange={event => set('homePublic', event.target.checked)} /> Cho phép người chưa đăng nhập xem địa chỉ nhà</label>
    <p className="field-help">Mặc định địa chỉ nhà chỉ hiện với quản trị viên. Chỉ bật công khai khi gia đình đồng ý.</p>
    <div className="form-divider"><span>Thông báo ngày giỗ</span></div><div className="form-grid"><label className="full">Số điện thoại liên hệ<input type="tel" value={form.zaloPhone} onChange={event => set('zaloPhone', event.target.value)} placeholder="Ví dụ: 0901234567" /><small>Số điện thoại chỉ hiển thị với ban quản trị.</small></label></div>
    <label className="checkbox-line standalone"><input type="checkbox" checked={form.zaloConsent} onChange={event => set('zaloConsent', event.target.checked)} /> Đăng ký nhận thông báo ngày giỗ</label>
    <div className="form-divider"><span>Ảnh và câu chuyện</span></div><div className="form-grid"><label className="full">Tải ảnh đại diện (JPG, PNG, WebP · tối đa 4 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setAvatarFile(event.target.files?.[0] || null)} /></label><label className="full">Hoặc đường dẫn ảnh<input type="url" value={form.avatar} onChange={event => set('avatar', event.target.value)} placeholder="https://..." /></label><label className="full">Tiểu sử / ghi chú<textarea rows={4} value={form.biography} onChange={event => set('biography', event.target.value)} placeholder="Lưu lại câu chuyện, kỷ niệm về thành viên..." /></label></div>
    {error && <div className="form-error" role="alert">{error}</div>}
    </div><div className="form-footer"><button type="button" className="outline-btn" onClick={close}>Hủy</button><button className="primary-btn" disabled={busy} type="submit">{busy ? 'Đang lưu...' : form.id ? 'Lưu thay đổi' : 'Thêm thành viên'} <ArrowRight size={16} /></button></div>
  </form></div>;
}
