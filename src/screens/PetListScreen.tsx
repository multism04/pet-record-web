import Avatar from '../components/Avatar';
import { DEFAULT_COLOR, MAX_PETS } from '../constants';
import { deletePet } from '../db';
import type { Pet } from '../types';
import { formatAge } from '../utils';

type Props = {
  pets: Pet[];
  selectedPetId: number | null;
  defaultPetId: number | null;
  onSelectPet: (id: number) => void;
  onSetDefault: (id: number | null) => void;
  onAddPet: () => void;
  onEditPet: (pet: Pet) => void;
  onChanged: () => void;
  onOpenSettings: () => void;
};

export default function PetListScreen({
  pets,
  selectedPetId,
  defaultPetId,
  onSelectPet,
  onSetDefault,
  onAddPet,
  onEditPet,
  onChanged,
  onOpenSettings,
}: Props) {
  const canAdd = pets.length < MAX_PETS;
  const selectedColor = pets.find((p) => p.id === selectedPetId)?.color ?? DEFAULT_COLOR;

  async function confirmDelete(pet: Pet) {
    if (!confirm(`「${pet.name}」を削除しますか？\nこのペットの記録・写真もすべて削除されます。`)) return;
    try {
      await deletePet(pet.id);
      onChanged();
    } catch (e) {
      alert(`削除に失敗しました: ${String(e)}`);
    }
  }

  return (
    <div className="app-body">
      <div className="screen">
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', margin: 0 }}>ペット管理</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, color: '#666' }}>
                {pets.length} / {MAX_PETS} 匹
              </span>
              <button onClick={onOpenSettings} style={{ fontSize: 22 }} aria-label="設定">
                ⚙️
              </button>
            </div>
          </div>

          {pets.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              <p>まだペットが登録されていません。</p>
              <p>「＋ ペットを追加」から登録しましょう。</p>
            </div>
          ) : (
            pets.map((item) => {
              const selected = item.id === selectedPetId;
              const isDefault = item.id === defaultPetId;
              const passed = !!item.farewell_date;
              const age = formatAge(item.birthday, item.farewell_date);
              const petColor = item.color ?? DEFAULT_COLOR;
              return (
                // カード内に「編集」「削除」「★」の実ボタンを含むため、
                // カード自体は button ではなく div + role="button" にする（button の入れ子はHTML違反）
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectPet(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectPet(item.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    width: '100%',
                    textAlign: 'left',
                    background: '#fff',
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 10,
                    border: `2px solid ${selected ? petColor : 'transparent'}`,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ marginRight: 12, flexShrink: 0 }}>
                    <Avatar name={item.name} color={petColor} photoPath={item.photo_path} size={48} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18, fontWeight: 600 }}>{item.name}</span>
                      {item.reading && <span style={{ fontSize: 13, color: '#888' }}>（{item.reading}）</span>}
                      {selected && (
                        <span
                          style={{
                            fontSize: 11,
                            color: '#fff',
                            background: petColor,
                            padding: '2px 8px',
                            borderRadius: 10,
                          }}
                        >
                          選択中
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefault(isDefault ? null : item.id);
                      }}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}
                    >
                      <span style={{ fontSize: 16, color: isDefault ? '#f9a825' : '#bbb' }}>
                        {isDefault ? '★' : '☆'}
                      </span>
                      <span style={{ fontSize: 12, color: isDefault ? '#f9a825' : '#aaa', fontWeight: isDefault ? 700 : 400 }}>
                        {isDefault ? '起動時に表示' : '起動時に表示にする'}
                      </span>
                    </button>
                    <p style={{ fontSize: 13, color: '#666', margin: '2px 0 0' }}>
                      {item.species}
                      {item.breed ? `・${item.breed}` : ''}
                      {item.sex ? `・${item.sex}` : ''}
                    </p>
                    {age && (
                      <p style={{ fontSize: 12, color: '#999', margin: '2px 0 0' }}>
                        {passed ? `享年 ${age}` : age}
                      </p>
                    )}
                    {passed && (
                      <p style={{ fontSize: 12, color: '#7e57c2', margin: '2px 0 0' }}>
                        🌈 {item.farewell_date}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, marginLeft: 8 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPet(item);
                      }}
                      style={{ color: '#1976d2', fontSize: 14, fontWeight: 600 }}
                    >
                      編集
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDelete(item);
                      }}
                      style={{ color: '#e53935', fontSize: 14, fontWeight: 600 }}
                    >
                      削除
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <button
          className="btn"
          style={{ background: canAdd ? selectedColor : '#bdbdbd' }}
          onClick={onAddPet}
          disabled={!canAdd}
        >
          {canAdd ? '＋ ペットを追加' : `上限（${MAX_PETS}匹）に達しています`}
        </button>
      </div>
    </div>
  );
}
