import { useRef, useState } from 'react';
import Avatar from '../components/Avatar';
import DateField from '../components/DateField';
import { DEFAULT_COLOR, PET_COLORS, SEX_OPTIONS, SPECIES_OPTIONS } from '../constants';
import { addPet, updatePet } from '../db';
import { readFileAsDataUrl } from '../photos';
import type { Pet, PetInput } from '../types';

type Props = {
  pet?: Pet;
  onSaved: () => void;
  onCancel: () => void;
};

function initialSpecies(pet?: Pet) {
  if (!pet) return { selected: '犬', custom: '' };
  const known = (SPECIES_OPTIONS as readonly string[]).includes(pet.species);
  if (known && pet.species !== 'その他') return { selected: pet.species, custom: '' };
  return { selected: 'その他', custom: pet.species };
}

export default function PetFormScreen({ pet, onSaved, onCancel }: Props) {
  const isEdit = !!pet;
  const initSp = initialSpecies(pet);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(pet?.name ?? '');
  const [reading, setReading] = useState(pet?.reading ?? '');
  const [speciesSel, setSpeciesSel] = useState<string>(initSp.selected);
  const [speciesCustom, setSpeciesCustom] = useState(initSp.custom);
  const [breed, setBreed] = useState(pet?.breed ?? '');
  const [sex, setSex] = useState<string>(pet?.sex ?? '');
  const [birthday, setBirthday] = useState(pet?.birthday ?? '');
  const [adoptedDate, setAdoptedDate] = useState(pet?.adopted_date ?? '');
  const [farewellDate, setFarewellDate] = useState(pet?.farewell_date ?? '');
  const [note, setNote] = useState(pet?.note ?? '');
  const [color, setColor] = useState<string>(pet?.color ?? DEFAULT_COLOR);
  const [photoPath, setPhotoPath] = useState<string | null>(pet?.photo_path ?? null);
  const [saving, setSaving] = useState(false);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setPhotoPath(await readFileAsDataUrl(file));
    } catch (err) {
      alert(`写真の読み込みに失敗しました: ${String(err)}`);
    }
  }

  const resolvedSpecies = speciesSel === 'その他' ? speciesCustom.trim() : speciesSel;

  async function handleSave() {
    if (name.trim() === '') {
      alert('名前を入力してください。');
      return;
    }
    if (resolvedSpecies === '') {
      alert('種類を入力してください。');
      return;
    }

    const input: PetInput = {
      name: name.trim(),
      reading: reading.trim() || null,
      species: resolvedSpecies,
      breed: breed.trim() || null,
      sex: sex || null,
      birthday: birthday.trim() || null,
      adopted_date: adoptedDate.trim() || null,
      farewell_date: farewellDate.trim() || null,
      photo_path: photoPath,
      note: note.trim() || null,
      color,
    };

    try {
      setSaving(true);
      if (isEdit && pet) {
        await updatePet(pet.id, input);
      } else {
        await addPet(input);
      }
      onSaved();
    } catch (e) {
      alert(`保存に失敗しました: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-body">
      <div className="header-bar">
        <button className="header-cancel" onClick={onCancel}>
          キャンセル
        </button>
        <span className="header-title">{isEdit ? 'ペットを編集' : 'ペットを追加'}</span>
        <button className="header-save" style={{ color }} onClick={handleSave} disabled={saving}>
          {saving ? '保存中…' : '保存'}
        </button>
      </div>

      <div className="screen">
        <div className="screen-pad">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `3px solid ${color}`, borderRadius: '50%', padding: 3 }}
            >
              <Avatar name={name || '？'} color={color} photoPath={photoPath} size={96} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={onPickPhoto}
            />
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ color, fontSize: 15, fontWeight: 600 }}
              >
                {photoPath ? '写真を変更' : '写真を追加'}
              </button>
              {photoPath && (
                <button
                  onClick={() => setPhotoPath(null)}
                  style={{ color: '#e53935', fontSize: 15, fontWeight: 600 }}
                >
                  削除
                </button>
              )}
            </div>
          </div>

          <p className="field-label">
            名前 <span className="field-required">*</span>
          </p>
          <input
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：狛"
          />

          <p className="field-label">読み仮名</p>
          <input
            className="text-input"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
            placeholder="例：はく"
          />

          <p className="field-label">メインカラー</p>
          <div className="chip-row">
            {PET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: c,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: color === c ? '2px solid #333' : '2px solid transparent',
                }}
              >
                {color === c && <span style={{ color: '#fff', fontWeight: 'bold' }}>✓</span>}
              </button>
            ))}
          </div>

          <p className="field-label">
            種類 <span className="field-required">*</span>
          </p>
          <div className="chip-row">
            {SPECIES_OPTIONS.map((sp) => (
              <button
                key={sp}
                className={`chip${speciesSel === sp ? ' active' : ''}`}
                style={speciesSel === sp ? { background: color } : undefined}
                onClick={() => setSpeciesSel(sp)}
              >
                {sp}
              </button>
            ))}
          </div>
          {speciesSel === 'その他' && (
            <input
              className="text-input"
              style={{ marginTop: 10 }}
              value={speciesCustom}
              onChange={(e) => setSpeciesCustom(e.target.value)}
              placeholder="種類を入力（例：フェレット）"
            />
          )}

          <p className="field-label">品種</p>
          <input
            className="text-input"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder="例：トイプードル"
          />

          <p className="field-label">性別</p>
          <div className="chip-row">
            {SEX_OPTIONS.map((s) => (
              <button
                key={s}
                className={`chip${sex === s ? ' active' : ''}`}
                style={sex === s ? { background: color } : undefined}
                onClick={() => setSex(sex === s ? '' : s)}
              >
                {s}
              </button>
            ))}
          </div>

          <p className="field-label">誕生日</p>
          <DateField value={birthday} onChange={setBirthday} maxIsToday />

          <p className="field-label">お迎え日</p>
          <DateField value={adoptedDate} onChange={setAdoptedDate} maxIsToday />

          <p className="field-label">お別れの日</p>
          <DateField value={farewellDate} onChange={setFarewellDate} maxIsToday />
          <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
            🌈 虹の橋を渡った日。入力すると一緒に過ごした期間を記録できます。
          </p>

          <p className="field-label">メモ</p>
          <textarea
            className="text-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="自由記入"
          />
        </div>
      </div>
    </div>
  );
}
