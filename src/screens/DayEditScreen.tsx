import { useEffect, useRef, useState } from 'react';
import DateField from '../components/DateField';
import PhotoViewerModal from '../components/PhotoViewerModal';
import { parseRecordText } from '../ai';
import { RECORD_CATEGORIES } from '../constants';
import {
  addPhoto,
  addRecord,
  deletePhoto,
  deleteRecord,
  getPhotosByDate,
  getRecordsByDate,
  updateRecord,
} from '../db';
import { readFileAsDataUrl } from '../photos';
import type { Photo } from '../types';
import { formatDateLabel, todayYmd } from '../utils';

type Props = {
  petId: number;
  petName: string;
  color: string;
  date: string;
  onSaved: () => void;
  onCancel: () => void;
};

type EditItem = {
  id: number | null;
  category: string;
  text: string;
  numeric: string;
  unit: string;
};

function isNumericCat(category: string): boolean {
  return RECORD_CATEGORIES.find((c) => c.key === category)?.numeric ?? false;
}
function unitOf(category: string): string {
  return RECORD_CATEGORIES.find((c) => c.key === category)?.unit ?? '';
}
function isMultipleCat(category: string): boolean {
  return RECORD_CATEGORIES.find((c) => c.key === category)?.multiple ?? false;
}

let tempKey = -1;

export default function DayEditScreen({ petId, petName, color, date: initialDate, onSaved, onCancel }: Props) {
  const [date, setDate] = useState(initialDate);
  const [items, setItems] = useState<(EditItem & { key: number })[]>([]);
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 日付が変わったら、その日付の記録項目を読み直す（写真と同じ挙動に揃える）
  useEffect(() => {
    (async () => {
      const rows = await getRecordsByDate(petId, date);
      setItems(
        rows.map((r) => ({
          key: r.id,
          id: r.id,
          category: r.category,
          text: r.text_value ?? '',
          numeric: r.numeric_value != null ? String(r.numeric_value) : '',
          unit: r.unit ?? unitOf(r.category),
        }))
      );
      setRemovedIds([]);
      setLoading(false);
    })();
  }, [petId, date]);

  async function reloadPhotos() {
    setPhotos(await getPhotosByDate(petId, date));
  }
  useEffect(() => {
    reloadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, date]);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await addPhoto(petId, date, dataUrl);
      await reloadPhotos();
    } catch (err) {
      alert(`写真の追加に失敗しました: ${String(err)}`);
    }
  }

  async function confirmDeletePhoto(photo: Photo) {
    if (!confirm('この写真を削除しますか？')) return;
    await deletePhoto(photo.id);
    await reloadPhotos();
  }

  function updateItem(key: number, patch: Partial<EditItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function changeCategory(key: number, category: string) {
    updateItem(key, { category, unit: unitOf(category) });
  }
  function removeItem(item: EditItem & { key: number }) {
    if (item.id != null) setRemovedIds((prev) => [...prev, item.id!]);
    setItems((prev) => prev.filter((it) => it.key !== item.key));
  }
  function addItem() {
    const cat = 'food';
    setItems((prev) => [...prev, { key: tempKey--, id: null, category: cat, text: '', numeric: '', unit: unitOf(cat) }]);
  }
  function makeItem(category: string, text: string, numeric: string) {
    return { key: tempKey--, id: null as number | null, category, text, numeric, unit: unitOf(category) };
  }

  async function analyzeAndAppend() {
    if (transcript.trim() === '') {
      alert('話した内容、または文章を入力してください。');
      return;
    }
    try {
      setAnalyzing(true);
      const p = await parseRecordText(transcript.trim());

      const parsedFields: { category: string; text: string; numeric: string }[] = [];
      if (p.weight !== null) parsedFields.push({ category: 'weight', text: '', numeric: String(p.weight) });
      if (p.food) parsedFields.push({ category: 'food', text: p.food, numeric: '' });
      if (p.food_amount !== null) parsedFields.push({ category: 'food_amount', text: '', numeric: String(p.food_amount) });
      if (p.treat) parsedFields.push({ category: 'treat', text: p.treat, numeric: '' });
      if (p.excretion) parsedFields.push({ category: 'excretion', text: p.excretion, numeric: '' });
      if (p.cleaning) parsedFields.push({ category: 'cleaning', text: p.cleaning, numeric: '' });
      if (p.medicine) parsedFields.push({ category: 'medicine', text: p.medicine, numeric: '' });
      if (p.hospital) parsedFields.push({ category: 'hospital', text: p.hospital, numeric: '' });
      if (p.other) parsedFields.push({ category: 'other', text: p.other, numeric: '' });

      if (parsedFields.length === 0) {
        alert('記録として抽出できる内容が見つかりませんでした。');
        return;
      }

      setItems((prev) => {
        const next = [...prev];
        for (const f of parsedFields) {
          if (isMultipleCat(f.category)) {
            next.push(makeItem(f.category, f.text, f.numeric));
            continue;
          }
          const idx = next.findIndex((it) => it.category === f.category);
          if (idx >= 0) {
            const cur = next[idx];
            if (isNumericCat(f.category)) {
              next[idx] = { ...cur, numeric: f.numeric };
            } else {
              const merged = cur.text.trim() ? `${cur.text.trim()} ${f.text}` : f.text;
              next[idx] = { ...cur, text: merged };
            }
          } else {
            next.push(makeItem(f.category, f.text, f.numeric));
          }
        }
        return next;
      });
      setTranscript('');
    } catch (e) {
      const msg = String(e);
      if (msg.includes('APIキー')) {
        alert(`${msg}\n\n「ペット」タブ右上の⚙️設定でGeminiのAPIキーを入力してください。`);
      } else {
        alert(`解析に失敗しました: ${msg}`);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      for (const id of removedIds) {
        await deleteRecord(id);
      }
      for (const it of items) {
        const numeric = isNumericCat(it.category);
        if (numeric) {
          if (it.numeric.trim() === '') continue;
        } else {
          if (it.text.trim() === '') continue;
        }
        const numericValue = numeric ? parseFloat(it.numeric) : null;
        if (numeric && (numericValue === null || isNaN(numericValue))) continue;
        const input = {
          pet_id: petId,
          date,
          category: it.category,
          text_value: numeric ? null : it.text.trim(),
          numeric_value: numericValue,
          unit: numeric ? it.unit.trim() || null : null,
        };
        if (it.id != null) {
          await updateRecord(it.id, input);
        } else {
          await addRecord(input);
        }
      }
      onSaved();
    } catch (e) {
      alert(`保存に失敗しました: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <div className="app-body">
      <div className="header-bar">
        <button className="header-cancel" onClick={onCancel}>
          キャンセル
        </button>
        <span className="header-title">記録を編集</span>
        <button className="header-save" style={{ color }} onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>

      <div className="screen">
        <div className="screen-pad">
          <p style={{ fontSize: 16, fontWeight: 600, color, margin: '0 0 4px' }}>🐾 {petName}</p>

          <p className="field-label">日付</p>
          <DateField value={date} onChange={(v) => setDate(v || todayYmd())} />
          <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>{formatDateLabel(date)}</p>

          {items.length === 0 && (
            <p style={{ color: '#999', marginTop: 20, textAlign: 'center' }}>
              まだ記録がありません。「＋ 項目を追加」で追加できます。
            </p>
          )}

          {items.map((it) => {
            const numeric = isNumericCat(it.category);
            return (
              <div
                key={it.key}
                className="card"
                style={{ marginTop: 16, borderLeft: `5px solid ${color}` }}
              >
                <div className="hscroll" style={{ gap: 8, paddingBottom: 2 }}>
                  {RECORD_CATEGORIES.map((c) => {
                    const active = c.key === it.category;
                    return (
                      <button
                        key={c.key}
                        className={`chip${active ? ' active' : ''}`}
                        style={active ? { background: color, flexShrink: 0 } : { flexShrink: 0 }}
                        onClick={() => changeCategory(it.key, c.key)}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>

                {numeric ? (
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <input
                      className="text-input"
                      style={{ flex: 1 }}
                      value={it.numeric}
                      onChange={(e) => updateItem(it.key, { numeric: e.target.value })}
                      placeholder="例：5.2"
                      inputMode="decimal"
                    />
                    <input
                      className="text-input"
                      style={{ width: 90 }}
                      value={it.unit}
                      onChange={(e) => updateItem(it.key, { unit: e.target.value })}
                      placeholder="単位"
                    />
                  </div>
                ) : (
                  <textarea
                    className="text-input"
                    style={{ marginTop: 10 }}
                    value={it.text}
                    onChange={(e) => updateItem(it.key, { text: e.target.value })}
                    placeholder="内容を入力"
                  />
                )}

                <div style={{ textAlign: 'right', marginTop: 10 }}>
                  <button
                    onClick={() => removeItem(it)}
                    style={{ color: '#e53935', fontSize: 13, fontWeight: 600 }}
                  >
                    この項目を削除
                  </button>
                </div>
              </div>
            );
          })}

          {/* 音声・文章からAIで追加（音声入力はスマホのキーボードのマイク機能を利用） */}
          <div style={{ marginTop: 20, padding: 14, background: '#f4f4f4', borderRadius: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>📝 文章から追加</p>
            <p style={{ fontSize: 12, color: '#888', margin: '4px 0 0' }}>
              例：「体重は5.2キロ、朝はドッグフードを20グラム食べた」（キーボードのマイクで話して入力もできます）
            </p>
            <textarea
              className="text-input"
              style={{ marginTop: 10 }}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="ここに入力（マイクで話してもOK）"
            />
          </div>

          {/* 「AIで振り分け」と「項目を追加」を横並びに */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              className="btn"
              style={{ flex: 1, background: color, opacity: analyzing ? 0.6 : 1 }}
              onClick={analyzeAndAppend}
              disabled={analyzing}
            >
              {analyzing ? '解析中…' : '✨ AIで振り分け'}
            </button>
            <button
              className="btn btn-outline"
              style={{ flex: 1, borderColor: color, color, borderStyle: 'dashed' }}
              onClick={addItem}
            >
              ＋ 項目を追加
            </button>
          </div>

          {/* 写真 */}
          <p style={{ fontSize: 15, fontWeight: 700, marginTop: 24, marginBottom: 10 }}>📷 写真</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {photos.map((ph, i) => (
              <div key={ph.id} style={{ position: 'relative' }}>
                <button onClick={() => setViewerIndex(i)}>
                  <img
                    src={ph.file_path}
                    alt=""
                    style={{ width: 90, height: 90, borderRadius: 10, background: '#eee', objectFit: 'cover', display: 'block' }}
                  />
                </button>
                <button
                  onClick={() => confirmDeletePhoto(ph)}
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    background: '#e53935',
                    color: '#fff',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 90,
                height: 90,
                borderRadius: 10,
                border: `1.5px dashed ${color}`,
                color,
                fontSize: 30,
                fontWeight: 300,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ＋
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPickPhoto}
            />
          </div>
          <p style={{ fontSize: 11, color: '#aaa', marginTop: 8 }}>
            写真の追加・削除はその場で保存されます。タップで拡大表示できます。
          </p>
        </div>
      </div>

      <PhotoViewerModal
        visible={viewerIndex !== null}
        photos={photos.map((ph) => ph.file_path)}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </div>
  );
}
