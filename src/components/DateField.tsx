import { todayYmd } from '../utils';

type Props = {
  value: string; // YYYY-MM-DD（空文字なら未設定）
  onChange: (value: string) => void;
  placeholder?: string;
  maxIsToday?: boolean; // 未来日を選べないようにする（誕生日・お迎え日など）
};

export default function DateField({ value, onChange, maxIsToday }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        type="date"
        className="text-input"
        value={value}
        max={maxIsToday ? todayYmd() : undefined}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1 }}
      />
      {value !== '' && (
        <button
          onClick={() => onChange('')}
          style={{ color: '#e53935', fontSize: 14, fontWeight: 600, padding: '8px 6px' }}
        >
          クリア
        </button>
      )}
    </div>
  );
}
