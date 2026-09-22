// アプリ全体で使う定数（pet-record-app（スマホ版）と同じ内容）

export const APP_VERSION = '1.0.0';

// 登録できるペットの上限
export const MAX_PETS = 5;

export const SPECIES_OPTIONS = ['犬', '猫', '鳥', 'うさぎ', 'ハムスター', 'その他'] as const;

export const SEX_OPTIONS = ['オス', 'メス', '不明'] as const;

export const DEFAULT_COLOR = '#4caf50';

export const PET_COLORS = [
  '#4caf50', // 緑
  '#42a5f5', // 青
  '#ff7043', // オレンジ
  '#ec407a', // ピンク
  '#ab47bc', // 紫
  '#ffca28', // 黄
  '#26a69a', // ティール
  '#8d6e63', // ブラウン
] as const;

export type RecordCategory = {
  key: string;
  label: string;
  numeric: boolean;
  unit?: string;
  multiple?: boolean;
};

export const RECORD_CATEGORIES: RecordCategory[] = [
  { key: 'weight', label: '体重', numeric: true, unit: 'kg' },
  { key: 'food', label: '食事内容', numeric: false, multiple: true },
  { key: 'food_amount', label: '食事量', numeric: true, unit: 'g', multiple: true },
  { key: 'treat', label: 'おやつ', numeric: false, multiple: true },
  { key: 'excretion', label: '排泄', numeric: false, multiple: true },
  { key: 'cleaning', label: '掃除', numeric: false },
  { key: 'medicine', label: '薬', numeric: false },
  { key: 'hospital', label: '病院記録', numeric: false },
  { key: 'other', label: 'その他', numeric: false },
];
