import { useCallback, useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import LineChart, { type ChartPoint } from '../components/LineChart';
import { DEFAULT_COLOR } from '../constants';
import { getDailyNumericLatest, getDailyNumericSum } from '../db';
import type { Pet } from '../types';
import { addDays, fromYmd, todayYmd } from '../utils';

type Props = {
  pets: Pet[];
  selectedPetId: number | null;
  onSelectPet: (id: number) => void;
  recordsVersion: number;
};

type Period = { key: string; label: string; days: number };
const PERIODS: Period[] = [
  { key: '1m', label: '1ヶ月', days: 30 },
  { key: '3m', label: '3ヶ月', days: 90 },
  { key: '1y', label: '1年', days: 365 },
  { key: '2y', label: '2年', days: 730 },
];

function shortLabel(ymd: string): string {
  const d = fromYmd(ymd);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function rangeLabel(ymd: string): string {
  const d = fromYmd(ymd);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function GraphScreen({ pets, selectedPetId, onSelectPet, recordsVersion }: Props) {
  const [periodKey, setPeriodKey] = useState('1m');
  const [endDate, setEndDate] = useState(todayYmd());
  const [weightData, setWeightData] = useState<ChartPoint[]>([]);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g'>('kg');
  const [foodData, setFoodData] = useState<ChartPoint[]>([]);

  const pet = pets.find((p) => p.id === selectedPetId) ?? null;
  const color = pet?.color ?? DEFAULT_COLOR;
  const period = PERIODS.find((p) => p.key === periodKey)!;

  const today = todayYmd();
  const fromDate = addDays(endDate, -(period.days - 1));
  const atLatest = endDate >= today;

  function shiftBack() {
    setEndDate(addDays(endDate, -period.days));
  }
  function shiftForward() {
    const next = addDays(endDate, period.days);
    setEndDate(next > today ? today : next);
  }
  function goLatest() {
    setEndDate(today);
  }

  const load = useCallback(async () => {
    if (!pet) {
      setWeightData([]);
      setWeightUnit('kg');
      setFoodData([]);
      return;
    }
    const weight = await getDailyNumericLatest(pet.id, 'weight', fromDate, endDate);
    const food = await getDailyNumericSum(pet.id, 'food_amount', fromDate, endDate);

    // 体重は基本kg記録だが、1kg未満の子（ハムスター等）はgの方が見やすいので自動で切り替える
    const maxWeight = weight.length > 0 ? Math.max(...weight.map((r) => r.value)) : 0;
    const useGrams = weight.length > 0 && maxWeight < 1;
    setWeightUnit(useGrams ? 'g' : 'kg');
    setWeightData(weight.map((r) => ({ label: shortLabel(r.date), value: useGrams ? r.value * 1000 : r.value })));
    setFoodData(food.map((r) => ({ label: shortLabel(r.date), value: r.value })));
  }, [pet, fromDate, endDate]);

  useEffect(() => {
    load();
  }, [load, recordsVersion]);

  if (pets.length === 0) {
    return (
      <div className="center">
        <p className="muted">まずペットを登録してください。</p>
      </div>
    );
  }

  return (
    <div className="app-body">
      <div className="hscroll" style={{ padding: '10px 12px', gap: 14 }}>
        {pets.map((p) => {
          const active = p.id === selectedPetId;
          const c = p.color ?? DEFAULT_COLOR;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPet(p.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 56, flexShrink: 0 }}
            >
              <div style={{ border: `3px solid ${active ? c : 'transparent'}`, borderRadius: 28, padding: 3 }}>
                <Avatar name={p.name} color={c} photoPath={p.photo_path} size={40} />
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: active ? c : '#666',
                  fontWeight: active ? 700 : 400,
                  marginTop: 3,
                  maxWidth: 54,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px' }}>
        {PERIODS.map((p) => {
          const active = p.key === periodKey;
          return (
            <button
              key={p.key}
              className="btn"
              style={{ background: active ? color : '#eee', color: active ? '#fff' : '#555', padding: '8px 0', fontSize: 14 }}
              onClick={() => setPeriodKey(p.key)}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px' }}>
        <button
          onClick={shiftBack}
          style={{ width: 40, height: 32, borderRadius: 8, background: '#eee', fontSize: 22, color: '#555' }}
        >
          ‹
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#333', margin: 0 }}>
            {rangeLabel(fromDate)} 〜 {rangeLabel(endDate)}
          </p>
          {!atLatest && (
            <button onClick={goLatest} style={{ fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>
              最新へ
            </button>
          )}
        </div>
        <button
          onClick={shiftForward}
          disabled={atLatest}
          style={{ width: 40, height: 32, borderRadius: 8, background: '#eee', fontSize: 22, color: '#555', opacity: atLatest ? 0.4 : 1 }}
        >
          ›
        </button>
      </div>

      <div className="screen" style={{ padding: '0 16px 40px' }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>体重 ({weightUnit})</p>
          <LineChart data={weightData} color={color} unit={weightUnit} baseline="auto" />
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>食事量 (g／日の合計)</p>
          <LineChart data={foodData} color={color} unit="g" baseline="zero" />
        </div>
      </div>
    </div>
  );
}
