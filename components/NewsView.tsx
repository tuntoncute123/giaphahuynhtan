'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { ContentRecord, NewsCategory } from '@/lib/types';
import {
  Camera,
  CalendarDays,
  MapPin,
  UserRound,
  Plus,
  Trash2,
  Edit3,
  X,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Utensils,
  BellRing,
  Search,
  Image as ImageIcon,
  ArrowRight,
  UploadCloud
} from 'lucide-react';

export const CATEGORY_INFO: Record<NewsCategory, { label: string; shortLabel: string; icon: typeof Flame; color: string; bg: string }> = {
  gio: { label: 'Lễ giỗ dòng họ', shortLabel: 'Lễ giỗ', icon: Flame, color: '#a6641b', bg: '#fbf0de' },
  le: { label: 'Đi lễ · Tảo mộ', shortLabel: 'Đi lễ', icon: Sparkles, color: '#25704d', bg: '#e8f5ed' },
  tiec: { label: 'Bữa tiệc · Họp họ', shortLabel: 'Tiệc họ', icon: Utensils, color: '#a83232', bg: '#fdeeed' },
  khac: { label: 'Tin tức · Khác', shortLabel: 'Tin tức', icon: BellRing, color: '#355c7d', bg: '#e9f1f7' }
};

export function displayNewsDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      if (year && month && day) {
        return `Ngày ${day} tháng ${month}, ${year}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Client-side image compression for mobile phone cameras
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        blob => {
          if (!blob) return resolve(file);
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

// Fullscreen Photo Lightbox
export function LightboxModal({
  images,
  initialIndex = 0,
  title,
  close
}: {
  images: string[];
  initialIndex?: number;
  title?: string;
  close: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') setIndex(i => (i + 1) % images.length);
      if (e.key === 'ArrowLeft') setIndex(i => (i - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [images.length, close]);

  if (!images.length) return null;

  return (
    <div className="lightbox-overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Xem ảnh toàn màn hình">
      <div className="lightbox-container" onClick={e => e.stopPropagation()}>
        <button type="button" className="lightbox-close" onClick={close} aria-label="Đóng ảnh">
          <X size={24} />
        </button>

        <div className="lightbox-image-wrap">
          <img src={images[index]} alt={title ? `${title} (${index + 1}/${images.length})` : `Ảnh ${index + 1}`} />
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              className="lightbox-nav-btn prev"
              onClick={() => setIndex(i => (i - 1 + images.length) % images.length)}
              aria-label="Ảnh trước"
            >
              <ChevronLeft size={30} />
            </button>
            <button
              type="button"
              className="lightbox-nav-btn next"
              onClick={() => setIndex(i => (i + 1) % images.length)}
              aria-label="Ảnh kế tiếp"
            >
              <ChevronRight size={30} />
            </button>
          </>
        )}

        <div className="lightbox-caption">
          {title && <span className="lightbox-title">{title}</span>}
          <span className="lightbox-counter">
            {index + 1} / {images.length}
          </span>
        </div>
      </div>
    </div>
  );
}

// Post or Edit News Modal
export function NewsPostModal({
  initial,
  close,
  onSaved
}: {
  initial?: Partial<ContentRecord> | null;
  close: () => void;
  onSaved: (record: ContentRecord, fullData?: any) => void;
}) {
  const [category, setCategory] = useState<NewsCategory>(initial?.category || 'gio');
  const [title, setTitle] = useState(initial?.title || '');
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState(initial?.location || '');
  const [author, setAuthor] = useState(initial?.author || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [existingImages, setExistingImages] = useState<string[]>(
    initial?.images && initial.images.length ? initial.images : initial?.fileUrl ? [initial.fileUrl] : []
  );
  const [newFiles, setNewFiles] = useState<{ file: File; preview: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const added = Array.from(e.target.files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setNewFiles(prev => [...prev, ...added]);
    e.target.value = '';
  };

  const removeExistingImage = (idx: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => {
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    if (!date) {
      setError('Vui lòng chọn ngày diễn ra.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const uploadedUrls: string[] = [...existingImages];

      // Upload new files
      for (let i = 0; i < newFiles.length; i++) {
        setProgressText(`Đang tải ảnh ${i + 1}/${newFiles.length}...`);
        const compressed = await compressImage(newFiles[i].file);
        const form = new FormData();
        form.append('file', compressed);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: form
        });
        const uploadResult = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadResult.error || `Lỗi tải ảnh thứ ${i + 1}`);
        }
        uploadedUrls.push(uploadResult.fileUrl);
      }

      setProgressText('Đang lưu bài viết...');

      const payload = {
        id: initial?.id,
        kind: 'event',
        category,
        title: title.trim(),
        date,
        location: location.trim(),
        author: author.trim(),
        description: description.trim(),
        images: uploadedUrls,
        fileUrl: uploadedUrls[0] || ''
      };

      const res = await fetch('/api/content', {
        method: initial?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Không lưu được bài viết.');
      }

      // Find saved record in result.content
      const savedRecord = (result.content as ContentRecord[]).find(
        r => r.id === (initial?.id || payload.id)
      ) || result.content[0];

      onSaved(savedRecord, result);
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu bài viết.');
    } finally {
      setBusy(false);
      setProgressText('');
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form
        className="form-modal news-post-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Đăng tin tức & hình ảnh kỷ niệm"
        onMouseDown={e => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="form-heading">
          <span className="section-kicker">NHỊP SỐNG DÒNG HỌ</span>
          <h2>{initial?.id ? 'Chỉnh sửa bài viết' : 'Đăng ảnh & Kỷ niệm dòng họ'}</h2>
          <p>Lưu giữ hình ảnh những ngày giỗ, đi lễ, tiệc họ và tin tức của con cháu Huỳnh Tấn Tộc.</p>
          <button type="button" className="modal-close" onClick={close} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        <div className="form-content">
          <div className="form-grid">
            <div className="full">
              <label className="field-group-title">Chủ đề bài viết <b>*</b></label>
              <div className="category-selector-tabs">
                {(['gio', 'le', 'tiec', 'khac'] as NewsCategory[]).map(catKey => {
                  const info = CATEGORY_INFO[catKey];
                  const Icon = info.icon;
                  const isActive = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      className={`cat-select-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setCategory(catKey)}
                      style={{
                        borderColor: isActive ? info.color : undefined,
                        color: isActive ? info.color : undefined,
                        backgroundColor: isActive ? info.bg : undefined
                      }}
                    >
                      <Icon size={16} />
                      <span>{info.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="full">
              Tiêu đề bài viết <b>*</b>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ví dụ: Lễ giỗ Cụ Tổ năm 2026, Đi lễ dâng hương đầu xuân, Họp họ mừng năm mới..."
              />
            </label>

            <label>
              Người đăng bài (con cháu trong họ)
              <input
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="Ví dụ: Huỳnh Tấn Minh (Đời 8) hoặc Gia đình bác Hai..."
              />
            </label>

            <label>
              Ngày diễn ra <b>*</b>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </label>

            <label className="full">
              Địa điểm
              <input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="Ví dụ: Nhà thờ tộc Huỳnh Tấn, Điện Bàn, Quảng Nam hoặc Nhà bác Hai..."
              />
            </label>

            <label className="full">
              Nội dung & Lời kể kỷ niệm
              <textarea
                rows={4}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Chia sẻ không khí buổi lễ, tiệc họ, các món ăn, những người tham dự hoặc kỷ niệm đáng nhớ của con cháu dòng họ..."
              />
            </label>

            <div className="full">
              <label className="field-group-title">
                Hình ảnh hoạt động (chọn nhiều ảnh cùng lúc)
              </label>

              <label className="image-dropzone">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <UploadCloud size={28} />
                <span>Bấm vào đây để chọn hoặc chụp ảnh từ máy ảnh</span>
                <small>Hỗ trợ JPG, PNG, WebP · Tự động tối ưu dung lượng hiển thị sắc nét</small>
              </label>

              {(existingImages.length > 0 || newFiles.length > 0) && (
                <div className="upload-preview-grid">
                  {existingImages.map((url, idx) => (
                    <div key={`exist-${idx}`} className="upload-preview-item">
                      <img src={url} alt={`Ảnh cũ ${idx + 1}`} />
                      <button
                        type="button"
                        className="remove-img-btn"
                        onClick={() => removeExistingImage(idx)}
                        title="Xóa ảnh này"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {newFiles.map((item, idx) => (
                    <div key={`new-${idx}`} className="upload-preview-item">
                      <img src={item.preview} alt={`Ảnh mới ${idx + 1}`} />
                      <button
                        type="button"
                        className="remove-img-btn"
                        onClick={() => removeNewFile(idx)}
                        title="Xóa ảnh này"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {error && <div className="form-error" role="alert">{error}</div>}
          {progressText && <div className="upload-progress-notice">{progressText}</div>}
        </div>

        <div className="form-footer">
          <button type="button" className="outline-btn" onClick={close} disabled={busy}>
            Hủy
          </button>
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? (progressText || 'Đang xử lý...') : 'Đăng lên dòng họ'} <ArrowRight size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

// Main News View Component
export default function NewsView({
  records,
  authenticated,
  onOpenCreate,
  onOpenEdit,
  onRemove
}: {
  records: ContentRecord[];
  authenticated: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (record: ContentRecord) => void;
  onRemove: (record: ContentRecord) => void;
}) {
  const [activeTab, setActiveTab] = useState<'all' | NewsCategory>('all');
  const [search, setSearch] = useState('');
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; title: string } | null>(null);

  // Filter events (news), exclude pure internal documents
  const newsRecords = useMemo(() => {
    return records
      .filter(r => r.kind === 'event')
      .sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt));
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return newsRecords.filter(r => {
      const matchCategory = activeTab === 'all' || (r.category || 'khac') === activeTab;
      if (!matchCategory) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.author && r.author.toLowerCase().includes(q)) ||
        (r.location && r.location.toLowerCase().includes(q))
      );
    });
  }, [newsRecords, activeTab, search]);

  const openPhoto = (images: string[], index: number, title: string) => {
    setLightbox({ images, index, title });
  };

  return (
    <section className="news-section container">
      <div className="section-toolbar news-toolbar">
        <div>
          <span className="section-kicker">NHỊP SỐNG DÒNG HỌ HUỲNH TẤN</span>
          <h2>Tin tức & Hoạt động dòng họ</h2>
          <p>
            Nơi sẻ chia và lưu giữ những khoảnh khắc ngày giỗ, đi lễ dâng hương, các bữa tiệc gặp mặt
            và kỷ niệm của con cháu qua từng thế hệ.
          </p>
        </div>
        <button className="primary-btn post-news-btn" onClick={onOpenCreate}>
          <Camera size={18} /> Đăng ảnh & Tin tức mới
        </button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="news-filters-bar">
        <div className="news-tabs">
          <button
            type="button"
            className={`news-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            Tất cả hoạt động ({newsRecords.length})
          </button>
          {(['gio', 'le', 'tiec', 'khac'] as NewsCategory[]).map(catKey => {
            const info = CATEGORY_INFO[catKey];
            const Icon = info.icon;
            const count = newsRecords.filter(r => (r.category || 'khac') === catKey).length;
            return (
              <button
                key={catKey}
                type="button"
                className={`news-tab-btn ${activeTab === catKey ? 'active' : ''}`}
                onClick={() => setActiveTab(catKey)}
              >
                <Icon size={15} style={{ color: info.color }} />
                <span>{info.label}</span>
                {count > 0 && <small className="tab-count">{count}</small>}
              </button>
            );
          })}
        </div>

        <div className="news-search-box">
          <Search size={17} />
          <input
            aria-label="Tìm kiếm tin tức"
            placeholder="Tìm theo tiêu đề, người đăng, địa điểm..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button type="button" className="clear-search" onClick={() => setSearch('')}>
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Result Count */}
      <div className="news-result-count">
        Đang hiển thị <strong>{filtered.length}</strong> bài viết
        {activeTab !== 'all' && ` thuộc mục “${CATEGORY_INFO[activeTab].label}”`}
      </div>

      {/* News Articles Feed */}
      {filtered.length > 0 ? (
        <div className="news-feed-list">
          {filtered.map(record => {
            const cat = record.category || 'khac';
            const info = CATEGORY_INFO[cat];
            const Icon = info.icon;
            const images = (record.images && record.images.length)
              ? record.images
              : record.fileUrl
              ? [record.fileUrl]
              : [];

            return (
              <article key={record.id} className="news-card">
                {/* Header */}
                <div className="news-card-header">
                  <div className="news-card-badge-line">
                    <span
                      className="news-cat-badge"
                      style={{ color: info.color, backgroundColor: info.bg }}
                    >
                      <Icon size={14} />
                      <strong>{info.label}</strong>
                    </span>
                    <span className="news-card-date">
                      <CalendarDays size={14} />
                      {displayNewsDate(record.date)}
                    </span>
                  </div>

                  <h3 className="news-card-title">{record.title}</h3>

                  <div className="news-meta-row">
                    {record.author && (
                      <span className="news-meta-author">
                        <UserRound size={14} /> {record.author}
                      </span>
                    )}
                    {record.location && (
                      <span className="news-meta-loc">
                        <MapPin size={14} /> {record.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                {record.description && (
                  <div className="news-card-desc">
                    <p>{record.description}</p>
                  </div>
                )}

                {/* Image Gallery */}
                {images.length > 0 && (
                  <div className={`news-gallery count-${Math.min(images.length, 4)}`}>
                    {images.slice(0, 4).map((url, imgIndex) => {
                      const isLastExtra = imgIndex === 3 && images.length > 4;
                      return (
                        <div
                          key={url + imgIndex}
                          className="news-gallery-cell"
                          onClick={() => openPhoto(images, imgIndex, record.title)}
                        >
                          <img src={url} alt={`${record.title} - Ảnh ${imgIndex + 1}`} loading="lazy" />
                          {isLastExtra && (
                            <div className="gallery-extra-overlay">
                              <span>+{images.length - 3} ảnh</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="news-card-footer">
                  {images.length > 0 && (
                    <button
                      type="button"
                      className="view-gallery-btn"
                      onClick={() => openPhoto(images, 0, record.title)}
                    >
                      <ImageIcon size={15} /> Xem toàn bộ ({images.length} ảnh)
                    </button>
                  )}

                  {authenticated && (
                    <div className="admin-news-actions">
                      <button
                        type="button"
                        className="admin-edit-btn"
                        onClick={() => onOpenEdit(record)}
                        title="Chỉnh sửa bài viết"
                      >
                        <Edit3 size={15} /> Sửa
                      </button>
                      <button
                        type="button"
                        className="admin-delete-btn"
                        onClick={() => onRemove(record)}
                        title="Xóa bài viết"
                      >
                        <Trash2 size={15} /> Xóa
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-news-state">
          <div className="empty-icon-circle">
            <Camera size={44} />
          </div>
          <h3>Chưa có bài viết nào</h3>
          <p>
            {activeTab !== 'all'
              ? `Chưa có thông tin hoặc hình ảnh trong mục “${CATEGORY_INFO[activeTab].label}”.`
              : 'Hãy là người đầu tiên chia sẻ hình ảnh ngày giỗ, đi lễ hoặc tiệc họp mặt của dòng họ!'}
          </p>
          <button type="button" className="primary-btn" onClick={onOpenCreate}>
            <Plus size={16} /> Chia sẻ kỷ niệm ngay
          </button>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <LightboxModal
          images={lightbox.images}
          initialIndex={lightbox.index}
          title={lightbox.title}
          close={() => setLightbox(null)}
        />
      )}
    </section>
  );
}
