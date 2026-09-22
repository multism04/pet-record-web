import { useEffect, useState, type CSSProperties } from 'react';
import { DEFAULT_COLOR } from './constants';
import { getDefaultPetId, getPets, initDb, setDefaultPetId } from './db';
import CalendarScreen from './screens/CalendarScreen';
import DayEditScreen from './screens/DayEditScreen';
import GraphScreen from './screens/GraphScreen';
import PetFormScreen from './screens/PetFormScreen';
import PetListScreen from './screens/PetListScreen';
import SettingsScreen from './screens/SettingsScreen';
import type { Pet } from './types';
import { todayYmd } from './utils';

type Tab = 'calendar' | 'graph' | 'pets';

function tabColorStyle(accent: string): CSSProperties {
  return { '--tab-color': accent } as CSSProperties;
}

type Overlay =
  | null
  | { type: 'petAdd' }
  | { type: 'petEdit'; pet: Pet }
  | { type: 'dayEdit'; date: string }
  | { type: 'settings' };

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<number | null>(null);
  const [defaultPetId, setDefaultPetIdState] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('calendar');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [recordsVersion, setRecordsVersion] = useState(0);

  async function reloadPets() {
    const list = await getPets();
    let def = await getDefaultPetId();
    if (def !== null && !list.some((p) => p.id === def)) {
      await setDefaultPetId(null);
      def = null;
    }
    setDefaultPetIdState(def);
    setPets(list);
    setSelectedPetId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev;
      if (def && list.some((p) => p.id === def)) return def;
      return list.length > 0 ? list[0].id : null;
    });
  }

  async function handleSetDefault(id: number | null) {
    await setDefaultPetId(id);
    setDefaultPetIdState(id);
  }

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        await reloadPets();
      } catch (e) {
        setError(String(e));
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const selectedPet = pets.find((p) => p.id === selectedPetId) ?? null;
  const accent = selectedPet?.color ?? DEFAULT_COLOR;

  if (!ready) {
    return (
      <div className="app">
        <div className="center">
          <p className="muted">読み込み中…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="center">
          <p style={{ fontSize: 18, fontWeight: 'bold', color: '#e53935' }}>エラーが発生しました</p>
          <p className="muted">{error}</p>
        </div>
      </div>
    );
  }

  if (overlay) {
    return (
      <div className="app">
        {overlay.type === 'petAdd' && (
          <PetFormScreen
            onSaved={async () => {
              await reloadPets();
              setOverlay(null);
            }}
            onCancel={() => setOverlay(null)}
          />
        )}
        {overlay.type === 'petEdit' && (
          <PetFormScreen
            pet={overlay.pet}
            onSaved={async () => {
              await reloadPets();
              setOverlay(null);
            }}
            onCancel={() => setOverlay(null)}
          />
        )}
        {overlay.type === 'dayEdit' && selectedPet && (
          <DayEditScreen
            petId={selectedPet.id}
            petName={selectedPet.name}
            color={accent}
            date={overlay.date}
            onSaved={() => {
              setRecordsVersion((v) => v + 1);
              setOverlay(null);
            }}
            onCancel={() => setOverlay(null)}
          />
        )}
        {overlay.type === 'settings' && (
          <SettingsScreen
            onClose={() => setOverlay(null)}
            onDataRestored={async () => {
              await reloadPets();
              setRecordsVersion((v) => v + 1);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-body">
        {tab === 'calendar' && (
          <CalendarScreen
            pets={pets}
            selectedPetId={selectedPetId}
            onSelectPet={setSelectedPetId}
            onOpenDayEdit={(date) => setOverlay({ type: 'dayEdit', date })}
            recordsVersion={recordsVersion}
            onRecordsChanged={() => setRecordsVersion((v) => v + 1)}
          />
        )}
        {tab === 'graph' && (
          <GraphScreen
            pets={pets}
            selectedPetId={selectedPetId}
            onSelectPet={setSelectedPetId}
            recordsVersion={recordsVersion}
          />
        )}
        {tab === 'pets' && (
          <PetListScreen
            pets={pets}
            selectedPetId={selectedPetId}
            defaultPetId={defaultPetId}
            onSelectPet={setSelectedPetId}
            onSetDefault={handleSetDefault}
            onAddPet={() => setOverlay({ type: 'petAdd' })}
            onEditPet={(pet) => setOverlay({ type: 'petEdit', pet })}
            onChanged={reloadPets}
            onOpenSettings={() => setOverlay({ type: 'settings' })}
          />
        )}
      </div>

      <div className="tabbar">
        <button
          className={`tabbar-item${tab === 'calendar' ? ' active' : ''}`}
          style={tabColorStyle(accent)}
          onClick={() => setTab('calendar')}
        >
          <span className="tabbar-icon">📅</span>
          <span>カレンダー</span>
        </button>

        <button
          className={`tabbar-item${tab === 'graph' ? ' active' : ''}`}
          style={tabColorStyle(accent)}
          onClick={() => setTab('graph')}
        >
          <span className="tabbar-icon">📈</span>
          <span>グラフ</span>
        </button>

        <button
          className="tabbar-item"
          onClick={() => {
            if (pets.length === 0) {
              setTab('pets');
              setOverlay({ type: 'petAdd' });
            } else {
              setOverlay({ type: 'dayEdit', date: todayYmd() });
            }
          }}
        >
          <span className="tabbar-fab" style={{ background: accent }}>
            ＋
          </span>
          <span>記録</span>
        </button>

        <button
          className={`tabbar-item${tab === 'pets' ? ' active' : ''}`}
          style={tabColorStyle(accent)}
          onClick={() => setTab('pets')}
        >
          <span className="tabbar-icon">🐾</span>
          <span>ペット</span>
        </button>
      </div>
    </div>
  );
}
