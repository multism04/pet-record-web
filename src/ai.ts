import { getSetting, setSetting } from './db';
import { getApiKey } from './secure';

// 使用するGeminiモデル（無料枠で使える高速モデル）。
export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';

export const MODEL_SETTING = 'ai_model';

export type ParsedRecord = {
  weight: number | null;
  food: string | null;
  food_amount: number | null;
  treat: string | null;
  excretion: string | null;
  cleaning: string | null;
  medicine: string | null;
  hospital: string | null;
  other: string | null;
};

const EMPTY: ParsedRecord = {
  weight: null,
  food: null,
  food_amount: null,
  treat: null,
  excretion: null,
  cleaning: null,
  medicine: null,
  hospital: null,
  other: null,
};

export async function listAvailableModels(): Promise<string[]> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('GeminiのAPIキーが未設定です。先にAPIキーを入力・保存してください。');
  }
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  );
  if (!res.ok) {
    throw new Error(`モデル一覧の取得に失敗 (${res.status})：${await res.text()}`);
  }
  const data = await res.json();
  const models: string[] = (data.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) =>
      (m.supportedGenerationMethods ?? []).includes('generateContent')
    )
    .map((m: { name: string }) => m.name.replace(/^models\//, ''));
  return models.sort((a, b) => {
    const af = a.includes('flash') ? 0 : 1;
    const bf = b.includes('flash') ? 0 : 1;
    return af - bf || a.localeCompare(b);
  });
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? null : n;
  }
  return null;
}

function toStr(v: unknown): string | null {
  if (typeof v === 'string' && v.trim() !== '') return v.trim();
  return null;
}

export async function parseRecordText(text: string): Promise<ParsedRecord> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('GeminiのAPIキーが未設定です。設定画面でAPIキーを入力してください。');
  }
  let model = (await getSetting(MODEL_SETTING)) || DEFAULT_GEMINI_MODEL;
  if (/^gemini-(1|2)\./.test(model)) {
    model = DEFAULT_GEMINI_MODEL;
    await setSetting(MODEL_SETTING, model);
  }

  const prompt = `あなたはペットの飼育記録アプリのアシスタントです。
以下の日本語の文章から、ペットの記録を抽出してJSONで返してください。

抽出する項目（キーは英語、該当する内容が無ければ null）:
- weight: 体重。数値のみ（単位kg換算）。例「5.2キロ」→5.2、「800グラム」→0.8
- food: 食事の内容（文字列）。例「ドッグフード」
- food_amount: 食事の量。数値のみ（単位g換算）。例「20グラム」→20
- treat: おやつの内容（文字列）。例「ジャーキー」。通常の食事(food)とは区別する
- excretion: 排泄（うんち・おしっこ）の内容や様子（文字列）。例「うんち普通」「おしっこ多め」
- cleaning: 掃除・トイレ清掃などの内容（文字列）
- medicine: 薬・投薬の内容（文字列）
- hospital: 病院・通院・診察の内容（文字列）
- other: 上記のどれにも当てはまらない特記事項（文字列）

ルール:
- 文章に無い項目は必ず null にする（推測で埋めない）
- weight と food_amount は数値のみ（単位や文字を含めない）
- 出力はJSONオブジェクトのみ。説明文は書かない

文章:
「${text}」`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`通信エラー：ネットワーク接続を確認してください。(${String(e)})`);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini APIエラー (${res.status})：${errText}`);
  }

  const data = await res.json();
  const out: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!out) {
    throw new Error('AIから有効な応答が得られませんでした。');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(out);
  } catch {
    throw new Error(`AIの応答を解釈できませんでした：${out}`);
  }

  return {
    ...EMPTY,
    weight: toNum(parsed.weight),
    food: toStr(parsed.food),
    food_amount: toNum(parsed.food_amount),
    treat: toStr(parsed.treat),
    excretion: toStr(parsed.excretion),
    cleaning: toStr(parsed.cleaning),
    medicine: toStr(parsed.medicine),
    hospital: toStr(parsed.hospital),
    other: toStr(parsed.other),
  };
}
