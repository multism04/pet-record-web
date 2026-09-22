// 汎用ユーティリティ（pet-record-app（スマホ版）と同じロジック）

// 誕生日(YYYY-MM-DD)から「生後○歳○ヶ月」を返す。未設定や不正な値なら null。
// asOf を渡すとその日時点の年齢（お別れの日を渡せば享年）を計算する。
export function formatAge(birthday: string | null, asOf?: string | null): string | null {
  if (!birthday) return null;
  const b = new Date(birthday);
  if (isNaN(b.getTime())) return null;

  const now = asOf ? fromYmd(asOf) : new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return null;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `生後${remMonths}ヶ月`;
  if (remMonths === 0) return `${years}歳`;
  return `${years}歳${remMonths}ヶ月`;
}

// Date -> "YYYY-MM-DD"（ローカル日付）
export function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// "YYYY-MM-DD" -> Date（不正/空なら今日）
export function fromYmd(s: string): Date {
  const d = new Date(s + 'T00:00:00');
  return isNaN(d.getTime()) ? new Date() : d;
}

// 今日の YYYY-MM-DD
export function todayYmd(): string {
  return toYmd(new Date());
}

// 日付を n 日ずらした YYYY-MM-DD
export function addDays(ymd: string, n: number): string {
  const d = fromYmd(ymd);
  d.setDate(d.getDate() + n);
  return toYmd(d);
}

// その日を含む週（日曜始まり）の7日分の YYYY-MM-DD
export function weekDays(ymd: string): string[] {
  const d = fromYmd(ymd);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return toYmd(x);
  });
}

// その日を含む月の、カレンダー表示用マス目（前後の月の日で埋めた6週=42日分）
export function monthGrid(ymd: string): string[] {
  const d = fromYmd(ymd);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    return toYmd(x);
  });
}

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

// 表示用に「M月D日(曜)」を返す
export function formatDateLabel(ymd: string): string {
  const d = fromYmd(ymd);
  return `${d.getMonth() + 1}月${d.getDate()}日(${WEEK_LABELS[d.getDay()]})`;
}

export function weekdayLabel(ymd: string): string {
  return WEEK_LABELS[fromYmd(ymd).getDay()];
}

export function dayOfMonth(ymd: string): number {
  return fromYmd(ymd).getDate();
}

export function monthLabel(ymd: string): string {
  const d = fromYmd(ymd);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

// n ヶ月ずらした月の1日を返す
export function addMonths(ymd: string, n: number): string {
  const d = fromYmd(ymd);
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return toYmd(x);
}
