import { useCallback, useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import { DEFAULT_COLOR } from '../constants';
import { getRecordCountsInRange, getRecordDatesInRange } from '../db';
import type { Pet } from '../types';
import {
  addMonths,
  dayOfMonth,
  fromYmd,
  monthGrid,
  monthLabel,
  todayYmd,
  weekDays,
  weekdayLabel,
} from '../utils';
import DayRecords from './DayRecords';

type ViewMode = 'month' | 'week' | 'day';

type Props = {
  pets: Pet[];
  selectedPetId: number | null;
  onSelectPet: (id: number) => void;
  onOpenDayEdit: (date: string) => void;
  recordsVersion: number;
  onRecordsChanged: () => void;
};

const WEEK_HEADER = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarScreen({
  pets,
  selectedPetId,
  onSelectPet,
  onOpenDayEdit,
  recordsVersion,
  onRecordsChanged,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [focusDate, setFocusDate] = useState(todayYmd());
  const [visibleMonth, setVisibleMonth] = useState(todayYmd().slice(0, 7) + '-01');
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [weekCounts, setWeekCounts] = useState<{ [date: string]: number }>({});

  const pet = pets.find((p) => p.id === selectedPetId) ?? null;
  const color = pet?.color ?? DEFAULT_COLOR;

  const loadMonthMarks = useCallback(async () => {
    if (!pet) {
      setMarkedDates(new Set());
      return;
    }
    const d = fromYmd(visibleMonth);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const to = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    const dates = await getRecordDatesInRange(pet.id, visibleMonth, to);
    setMarkedDates(new Set(dates));
  }, [pet, visibleMonth]);

  const loadWeekCounts = useCallback(async () => {
    if (!pet) {
      setWeekCounts({});
      return;
    }
    const days = weekDays(focusDate);
    const counts = await getRecordCountsInRange(pet.id, days[0], days[6]);
    const map: { [date: string]: number } = {};
    counts.forEach((c) => (map[c.date] = c.count));
    setWeekCounts(map);
  }, [pet, focusDate]);

  useEffect(() => {
    loadMonthMarks();
  }, [loadMonthMarks, recordsVersion]);

  useEffect(() => {
    loadWeekCounts();
  }, [loadWeekCounts, recordsVersion]);

  if (pets.length === 0) {
    return (
      <div className="center">
        <p className="muted">まずペットを登録してください。</p>
        <p className="muted">下の「ペット」タブから追加できます。</p>
      </div>
    );
  }

  const today = todayYmd();
  const grid = monthGrid(visibleMonth);
  const currentMonthIndex = fromYmd(visibleMonth).getMonth();

  return (
    <div className="app-body">
      {/* ペット切替 */}
      <div className="hscroll" style={{ padding: '10px 12px', gap: 14 }}>
        {pets.map((p) => {
          const active = p.id === selectedPetId;
          const c = p.color ?? DEFAULT_COLOR;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPet(p.id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 60, flexShrink: 0 }}
            >
              <div style={{ border: `3px solid ${active ? c : 'transparent'}`, borderRadius: 30, padding: 3 }}>
                <Avatar name={p.name} color={c} photoPath={p.photo_path} size={44} />
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: active ? c : '#666',
                  fontWeight: active ? 700 : 400,
                  marginTop: 3,
                  maxWidth: 58,
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

      {/* 月/週/日 切替 */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px 8px' }}>
        {(['month', 'week', 'day'] as ViewMode[]).map((m) => {
          const active = m === viewMode;
          const label = m === 'month' ? '月' : m === 'week' ? '週' : '日';
          return (
            <button
              key={m}
              className="btn"
              style={{ background: active ? color : '#eee', color: active ? '#fff' : '#555', padding: '8px 0' }}
              onClick={() => setViewMode(m)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {viewMode === 'month' && (
        <div style={{ padding: '0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 10px' }}>
            <button onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))} style={{ fontSize: 22, color, padding: '4px 12px' }}>
              ‹
            </button>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{monthLabel(visibleMonth)}</span>
            <button onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))} style={{ fontSize: 22, color, padding: '4px 12px' }}>
              ›
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center' }}>
            {WEEK_HEADER.map((w) => (
              <span key={w} style={{ fontSize: 12, color: '#999', paddingBottom: 6 }}>
                {w}
              </span>
            ))}
            {grid.map((d) => {
              const inMonth = fromYmd(d).getMonth() === currentMonthIndex;
              const isToday = d === today;
              const isSelected = d === focusDate;
              const hasMark = markedDates.has(d);
              return (
                <button
                  key={d}
                  onClick={() => {
                    setFocusDate(d);
                    setViewMode('day');
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '6px 0',
                    opacity: inMonth ? 1 : 0.35,
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      lineHeight: '28px',
                      borderRadius: 14,
                      fontSize: 14,
                      fontWeight: isToday ? 700 : 400,
                      color: isSelected ? '#fff' : isToday ? color : '#333',
                      background: isSelected ? color : 'transparent',
                    }}
                  >
                    {dayOfMonth(d)}
                  </span>
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      marginTop: 2,
                      background: hasMark ? color : 'transparent',
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', padding: '4px 8px 0' }}>
            {weekDays(focusDate).map((d) => {
              const isFocus = d === focusDate;
              const isToday = d === today;
              const count = weekCounts[d] ?? 0;
              return (
                <button
                  key={d}
                  onClick={() => {
                    setFocusDate(d);
                    setViewMode('day');
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 3,
                    padding: '8px 0',
                    borderRadius: 8,
                    background: isFocus ? color + '22' : 'transparent',
                  }}
                >
                  <span style={{ fontSize: 12, color: '#888' }}>{weekdayLabel(d)}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: isToday ? color : '#333' }}>{dayOfMonth(d)}</span>
                  <span style={{ width: 6, height: 6, borderRadius: 3, background: count > 0 ? color : 'transparent' }} />
                </button>
              );
            })}
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa', margin: '4px 0' }}>
            日をタップすると詳細が見られます
          </p>
          {pet && (
            <DayRecords
              petId={pet.id}
              color={color}
              date={focusDate}
              onChangeDate={setFocusDate}
              onOpenDayEdit={onOpenDayEdit}
              onRecordsChanged={onRecordsChanged}
            />
          )}
        </div>
      )}

      {viewMode === 'day' && pet && (
        <DayRecords
          petId={pet.id}
          color={color}
          date={focusDate}
          onChangeDate={setFocusDate}
          onOpenDayEdit={onOpenDayEdit}
          onRecordsChanged={onRecordsChanged}
        />
      )}
    </div>
  );
}
