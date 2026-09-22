import { useCallback, useEffect, useState } from 'react';
import PhotoViewerModal from '../components/PhotoViewerModal';
import { RECORD_CATEGORIES } from '../constants';
import { deleteRecord, getPhotosByDate, getRecordsByDate } from '../db';
import type { Photo, Record } from '../types';
import { addDays, formatDateLabel } from '../utils';

type Props = {
  petId: number;
  color: string;
  date: string;
  onChangeDate: (date: string) => void;
  onOpenDayEdit: (date: string) => void;
  onRecordsChanged?: () => void;
};

function categoryLabel(key: string): string {
  return RECORD_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
function formatValue(r: Record): string {
  if (r.numeric_value !== null && r.numeric_value !== undefined) {
    return `${r.numeric_value}${r.unit ?? ''}`;
  }
  return r.text_value ?? '';
}

export default function DayRecords({ petId, color, date, onChangeDate, onOpenDayEdit, onRecordsChanged }: Props) {
  const [records, setRecords] = useState<Record[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setRecords(await getRecordsByDate(petId, date));
    setPhotos(await getPhotosByDate(petId, date));
    setLoading(false);
  }, [petId, date]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete(r: Record) {
    if (!confirm(`「${categoryLabel(r.category)}：${formatValue(r)}」を削除しますか？`)) return;
    await deleteRecord(r.id);
    await load();
    onRecordsChanged?.();
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 24px' }}>
        <button onClick={() => onChangeDate(addDays(date, -1))} style={{ fontSize: 30, color: '#666', padding: '0 12px' }}>
          ‹
        </button>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{formatDateLabel(date)}</span>
        <button onClick={() => onChangeDate(addDays(date, 1))} style={{ fontSize: 30, color: '#666', padding: '0 12px' }}>
          ›
        </button>
      </div>

      <div className="screen" style={{ padding: '0 16px' }}>
        {loading ? null : records.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999', marginTop: 30 }}>この日の記録はありません。</p>
        ) : (
          records.map((r) => (
            // 内側に「削除」の実ボタンを含むため div + role="button"（button の入れ子はHTML違反）
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenDayEdit(date)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onOpenDayEdit(date);
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                background: '#fff',
                borderRadius: 10,
                borderLeft: `5px solid ${color}`,
                padding: '12px 14px',
                marginBottom: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: '#888', margin: 0 }}>{categoryLabel(r.category)}</p>
                <p style={{ fontSize: 16, fontWeight: 600, margin: '2px 0 0' }}>{formatValue(r)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  confirmDelete(r);
                }}
                style={{ color: '#e53935', fontSize: 14, fontWeight: 600, marginLeft: 12 }}
              >
                削除
              </button>
            </div>
          ))
        )}

        {photos.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4, paddingBottom: 8 }}>
            {photos.map((ph, i) => (
              <button key={ph.id} onClick={() => setViewerIndex(i)}>
                <img
                  src={ph.file_path}
                  alt=""
                  style={{ width: 80, height: 80, borderRadius: 8, background: '#eee', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <PhotoViewerModal
        visible={viewerIndex !== null}
        photos={photos.map((ph) => ph.file_path)}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />

      <div style={{ padding: 16 }}>
        <button className="btn" style={{ background: color }} onClick={() => onOpenDayEdit(date)}>
          この日の記録を編集・追加
        </button>
      </div>
    </div>
  );
}
